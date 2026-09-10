"""Factory for the isolated production demo. It never imports the recovered app."""

from __future__ import annotations

from datetime import timedelta
import hmac
import ipaddress
import logging
import math
import os
from pathlib import Path
import re
import secrets
import time
from urllib.parse import urlsplit
from uuid import uuid4

import click
import certifi
from alembic.migration import MigrationContext
from flask import Flask, abort, g, request, send_from_directory
from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.errors import RateLimitExceeded
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate, upgrade
from flask_wtf.csrf import CSRFError, CSRFProtect
from pydantic import ValidationError
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.pool import NullPool
from werkzeug.exceptions import HTTPException

from .config import ConfigurationError, load_config, require_state
from .db import SCHEMA_REVISION, atomic, db
from .domain import cleanup
from .errors import ApiError, error_response

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations-demo"
CRON_PATH = "/api/maintenance/cleanup"


def vercel_cron_host(config) -> str | None:
    """Return the one Vercel deployment host that may invoke the Cron route."""
    if not config.database_url or os.environ.get("VERCEL") != "1":
        return None
    candidate = os.environ.get("VERCEL_URL", "")
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app", candidate):
        raise ConfigurationError("VERCEL_URL must be an exact Vercel deployment host")
    return candidate


def prepare_state(config):
    """load_config already rejected recovery aliases before any file effects."""
    config.state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    config.state_dir.chmod(0o700)
    if not config.key_path.exists():
        descriptor = os.open(
            config.key_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600
        )
        with os.fdopen(descriptor, "w", encoding="ascii") as handle:
            handle.write(secrets.token_urlsafe(48))
    config.key_path.chmod(0o600)
    if not config.database_path.exists():
        descriptor = os.open(
            config.database_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600
        )
        os.close(descriptor)
    config.database_path.chmod(0o600)


def assert_revision():
    with db.engine.connect() as connection:
        revision = MigrationContext.configure(connection).get_current_revision()
    if revision != SCHEMA_REVISION:
        raise ConfigurationError(
            "Demo schema is not current; run the documented migration command"
        )


def create_app(overrides=None, *, initialize=False):
    values = overrides or {}
    config = load_config(values)
    if initialize and not config.database_url:
        prepare_state(config)
    key = require_state(config)
    if (
        not config.testing
        and not initialize
        and (not config.static_dir or not (config.static_dir / "index.html").is_file())
    ):
        raise ConfigurationError("A production web export is required before serving")
    app = Flask(__name__, static_folder=None)
    secure = config.external_origin.startswith("https:")
    canonical_host = urlsplit(config.external_origin).netloc
    cron_host = vercel_cron_host(config)
    trusted_hosts = [urlsplit(config.external_origin).hostname] + ([cron_host] if cron_host else [])
    app.config.update(
        TESTING=config.testing,
        DEMO_CONFIG=config,
        SECRET_KEY=key,
        SQLALCHEMY_DATABASE_URI=config.database_url or f"sqlite:///{config.database_path}",
        SQLALCHEMY_ENGINE_OPTIONS=(
            {
                "poolclass": NullPool,
                "hide_parameters": True,
                "connect_args": {
                    "connect_timeout": 5,
                    **({} if config.testing else {
                        "sslmode": "verify-full", "sslrootcert": certifi.where()
                    }),
                },
            }
            if config.database_url
            else {"connect_args": {"timeout": 5}}
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=16 * 1024,
        SESSION_COOKIE_NAME="__Host-aura-demo" if secure else "aura-demo-loopback",
        SESSION_COOKIE_SECURE=secure,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_PATH="/",
        SESSION_COOKIE_DOMAIN=None,
        SESSION_REFRESH_EACH_REQUEST=False,
        PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
        WTF_CSRF_TIME_LIMIT=3600,
        WTF_CSRF_SSL_STRICT=False,
        TRUSTED_HOSTS=trusted_hosts,
        COMPRESS_MIN_SIZE=500,
        COMPRESS_BR_LEVEL=6,
        COMPRESS_ALGORITHM=["br", "gzip"],
        RATELIMIT_ENABLED=values.get("RATELIMIT_ENABLED", True),
    )
    db.init_app(app)
    Migrate(app, db, directory=str(MIGRATIONS))
    with app.app_context():
        if config.database_url:
            # Neon transaction pooling rejects timeout settings in startup options.
            # SET LOCAL bounds every transaction without leaking state to its next user.
            def transaction_timeouts(connection):
                connection.exec_driver_sql("SET LOCAL statement_timeout = '10s'")
                connection.exec_driver_sql("SET LOCAL lock_timeout = '5s'")

            event.listen(db.engine, "begin", transaction_timeouts)
        if initialize:
            upgrade(directory=str(MIGRATIONS))
        # Hosted imports do not connect, migrate, or delete. Release initialization
        # and explicit health/maintenance operations own those effects.
        if initialize or not config.database_url:
            assert_revision()
            with atomic() as transaction:
                cleanup(transaction)
        storage_options = {}
        if config.database_url:
            # Import registers this backend with the native limits storage factory.
            from .postgres_limits import PostgresFixedWindowStorage
            storage_options = {"engine": db.engine, "key_salt": key}

    def peer_address():
        if config.database_url and os.environ.get("VERCEL") == "1":
            forwarded = request.headers.get("x-vercel-forwarded-for", "").split(",")[0].strip()
            try:
                return str(ipaddress.ip_address(forwarded))
            except ValueError:
                return "unidentified-vercel-peer"
        return get_remote_address()

    limiter = Limiter(
        peer_address,
        app=app,
        storage_uri="aura-postgres://" if config.database_url else "memory://",
        storage_options=storage_options,
        strategy="fixed-window",
        headers_enabled=True,
        default_limits=[],
    )
    app.extensions["aura_limiter"] = limiter

    @app.before_request
    def request_boundary():
        g.request_id = str(uuid4())
        is_cron_route = (
            cron_host is not None
            and request.host == cron_host
            and request.method == "GET"
            and request.path == CRON_PATH
        )
        # Visitor traffic stays canonical. Vercel's generated deployment host can
        # reach only the scheduled cleanup route, whose handler still checks its secret.
        if request.host != canonical_host and not is_cron_route:
            raise ApiError(400, "invalid_host", "This host is not configured for Aura.")
        if request.path.startswith("/api/") and request.url_rule is None:
            abort(404)
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            if request.headers.get("Origin") != config.external_origin:
                raise ApiError(
                    403,
                    "origin",
                    "Open Aura from its configured address and try again.",
                )
            if request.mimetype != "application/json":
                raise ApiError(400, "json_required", "Send this request as JSON.")

    CSRFProtect(app)
    Compress(app)

    @app.after_request
    def response_boundary(response):
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        frames = "'self'" + (
            (" " + " ".join(config.frame_origins)) if config.frame_origins else ""
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; font-src 'self'; "
            f"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors {frames}"
        )
        if response.status_code == 429 and "Retry-After" not in response.headers:
            response.headers["Retry-After"] = "60"
        return response

    @app.errorhandler(ApiError)
    def domain_error(error):
        return error_response(error.status, error.code, error.message, error.fields)

    @app.errorhandler(CSRFError)
    def csrf_error(_error):
        return error_response(
            403, "csrf", "The request token expired or is missing. Please try again."
        )

    @app.errorhandler(ValidationError)
    def validation_error(error):
        fields = {
            ".".join(map(str, item["loc"])): item["msg"]
            for item in error.errors(include_input=False)
        }
        return error_response(
            400, "validation", "Check the highlighted fields and try again.", fields
        )

    @app.errorhandler(RateLimitExceeded)
    def rate_error(_error):
        response, status = error_response(
            429, "rate_limit", "Please pause before trying again."
        )
        limit = limiter.current_limit
        response.headers["Retry-After"] = (
            str(max(1, math.ceil(limit.reset_at - time.time()))) if limit else "60"
        )
        return response, status

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {
            400: "The request could not be read.",
            404: "This route is not available.",
            405: "That method is not available.",
            413: "This request is too large.",
        }
        return error_response(
            error.code,
            f"http_{error.code}",
            messages.get(error.code, "The request could not be completed."),
        )

    @app.errorhandler(OperationalError)
    def storage_busy(_error):
        response, status = error_response(
            503, "storage_busy", "Aura is busy saving a moment. Please try again."
        )
        response.headers["Retry-After"] = "1"
        return response, status

    @app.errorhandler(IntegrityError)
    def invalid_transaction(_error):
        return error_response(
            409,
            "transaction_conflict",
            "This change conflicts with the saved state. Please reload it and try again.",
        )

    @app.errorhandler(Exception)
    def unexpected(error):
        # Exception strings from database drivers can contain journal parameters. Do not log them.
        app.logger.error(
            "Aura request failed: requestId=%s type=%s",
            getattr(g, "request_id", "unavailable"),
            type(error).__name__,
        )
        return error_response(
            500, "internal", "Aura could not finish this request. Please try again."
        )

    from .routes import register_api

    register_api(app, limiter, peer_address)

    @app.cli.command("demo-cleanup")
    def cleanup_command():
        with atomic() as transaction:
            removed = cleanup(transaction)
        if config.database_url:
            limiter.storage.prune_expired()
        click.echo(f"Removed {removed} expired demo sessions.")

    @app.get(CRON_PATH)
    def scheduled_cleanup():
        expected = os.environ.get("CRON_SECRET", "")
        supplied = request.headers.get("Authorization", "")
        if (
            not config.database_url
            or len(expected) < 32
            or not hmac.compare_digest(
                supplied.encode("utf-8"), ("Bearer " + expected).encode("utf-8")
            )
        ):
            abort(404)
        with atomic() as transaction:
            removed = cleanup(transaction)
        limiter.storage.prune_expired()
        return {"status": "ok", "expiredSessionsRemoved": removed}

    @app.get("/")
    @app.get("/<path:path>")
    def exported_client(path=""):
        if path.startswith("api/") or path == "api":
            abort(404)
        if not config.static_dir:
            abort(404)
        if path.startswith(("assets/", "_expo/")) or path == "favicon.ico":
            response = send_from_directory(config.static_dir, path)
            response.direct_passthrough = False
            response.get_data()  # Buffer the bounded export so gzip is supported.
            response.headers["Cache-Control"] = (
                "public, max-age=31536000, immutable"
                if re.search(r"[-.][a-f0-9]{32,64}\.", path)
                else "no-cache"
            )
            return response
        if path not in {
            "",
            "check-in",
            "moments",
            "patterns",
            "about",
        } and not re.fullmatch(r"moments/[a-f0-9-]{36}", path):
            abort(404)
        response = send_from_directory(config.static_dir, "index.html")
        response.direct_passthrough = False
        response.get_data()
        response.headers["Cache-Control"] = "no-store"
        return response

    # Library CSRF messages may include diagnostics; the domain handler above is the public boundary.
    logging.getLogger("flask_wtf.csrf").setLevel(logging.WARNING)
    return app
