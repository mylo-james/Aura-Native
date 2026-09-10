"""Hosted import boundaries and actual PostgreSQL request/maintenance behavior."""

import os
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from sqlalchemy import make_url, select, text

from aura_demo import create_app
from aura_demo.config import ConfigurationError, load_config
from aura_demo.db import DemoSession, db

ORIGIN = "https://aura.example.test"
VERCEL_HOST = "aura-production-123.vercel.app"
VERCEL_ORIGIN = f"https://{VERCEL_HOST}"
SECRET = "serverless-contract-secret-only-" * 2
TEST_URL = os.environ.get("AURA_SERVERLESS_TEST_DATABASE_URL")


def hosted_settings(**changes):
    return {
        "AURA_DATABASE_URL": "postgresql+psycopg://runtime:unused@db.invalid/aura",
        "AURA_SECRET_KEY": SECRET,
        "AURA_EXTERNAL_ORIGIN": ORIGIN,
        "AURA_DEMO_STATE_DIR": None,
        **changes,
    }


def test_hosted_import_never_connects_or_initializes_state(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>Aura</title>")
    with (
        patch("psycopg.connect", side_effect=AssertionError("Startup connected")),
        patch("aura_demo.app.prepare_state", side_effect=AssertionError("Startup wrote state")),
        patch("aura_demo.app.upgrade", side_effect=AssertionError("Startup migrated")),
        patch("aura_demo.app.cleanup", side_effect=AssertionError("Startup deleted")),
    ):
        app = create_app(hosted_settings(AURA_DEMO_STATIC_DIR=str(tmp_path)))
        response = app.test_client().get("/", base_url=ORIGIN)
        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "no-store"
    assert sorted(item.name for item in tmp_path.iterdir()) == ["index.html"]
    assert SECRET not in repr(app.config["DEMO_CONFIG"])
    assert "runtime:unused" not in repr(app.config["DEMO_CONFIG"])


@pytest.mark.parametrize("changes", [
    {"AURA_SECRET_KEY": "short"},
    {"AURA_DATABASE_URL": "sqlite:////tmp/unrelated.sqlite"},
    {"AURA_DATABASE_URL": "postgresql://runtime:unused@db.invalid/aura"},
    {"AURA_DATABASE_URL": "postgresql+psycopg:///aura"},
    {"AURA_DEMO_STATE_DIR": "/tmp/unrelated-state"},
])
def test_hosted_mode_requires_explicit_complete_configuration(changes):
    with pytest.raises(ConfigurationError) as caught:
        load_config(hosted_settings(**changes))
    assert "unused" not in str(caught.value)


def isolated_test_database(url):
    if not url:
        return False
    parsed = make_url(url)
    return (
        parsed.drivername == "postgresql+psycopg"
        and parsed.database == "aura_serverless_test"
        and (parsed.host in {"localhost", "127.0.0.1", "::1"}
             or (parsed.host is None and str(parsed.query.get("host", "")).startswith("/private/tmp/aura-hosting-postgres/")))
    )


@pytest.fixture
def hosted_app():
    if not isolated_test_database(TEST_URL):
        pytest.skip("Requires explicitly isolated local aura_serverless_test database")
    app = create_app(hosted_settings(TESTING=True, AURA_DATABASE_URL=TEST_URL), initialize=True)
    with app.app_context(), db.engine.begin() as connection:
        connection.execute(text("TRUNCATE demo_sessions, aura_rate_limit_buckets CASCADE"))
    yield app
    with app.app_context():
        db.engine.dispose()


@pytest.fixture
def vercel_hosted_app(monkeypatch):
    if not isolated_test_database(TEST_URL):
        pytest.skip("Requires explicitly isolated local aura_serverless_test database")
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("VERCEL_URL", VERCEL_HOST)
    monkeypatch.setenv("CRON_SECRET", SECRET)
    app = create_app(hosted_settings(TESTING=True, AURA_DATABASE_URL=TEST_URL), initialize=True)
    with app.app_context(), db.engine.begin() as connection:
        connection.execute(text("TRUNCATE demo_sessions, aura_rate_limit_buckets CASCADE"))
    yield app
    with app.app_context():
        db.engine.dispose()


def start(client):
    token = client.get("/api/demo", base_url=ORIGIN).json["csrfToken"]
    response = client.post("/api/demo", base_url=ORIGIN, json={"timezone": "UTC"},
                           headers={"Origin": ORIGIN, "X-CSRFToken": token})
    assert response.status_code == 201, response.json


def test_postgres_timeouts_are_applied_inside_each_transaction(hosted_app):
    for _ in range(2):
        with hosted_app.app_context(), db.engine.begin() as connection:
            assert connection.scalar(text("SHOW statement_timeout")) == "10s"
            assert connection.scalar(text("SHOW lock_timeout")) == "5s"


def test_daily_cleanup_requires_secret_and_only_removes_expired_sessions(hosted_app, monkeypatch):
    first, second = hosted_app.test_client(), hosted_app.test_client()
    start(first)
    start(second)
    with first.session_transaction(base_url=ORIGIN) as cookie:
        expired_id = cookie["principal"]
    with hosted_app.app_context(), db.engine.begin() as connection:
        connection.execute(text("UPDATE demo_sessions SET expires_at=:expiry WHERE id=:id"),
                           {"expiry": (datetime.now(UTC) - timedelta(hours=1)).isoformat(), "id": expired_id})
        connection.execute(text("INSERT INTO aura_rate_limit_buckets VALUES (:key, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour')"), {"key": "a" * 64})
    monkeypatch.setenv("CRON_SECRET", SECRET)
    for auth in (None, "Bearer wrong", "Bearer café"):
        response = first.get("/api/maintenance/cleanup", base_url=ORIGIN,
                             headers={"Authorization": auth} if auth else {})
        assert response.status_code == 404
    for expected in (1, 0):
        response = first.get("/api/maintenance/cleanup", base_url=ORIGIN,
                             headers={"Authorization": "Bearer " + SECRET})
        assert response.status_code == 200
        assert response.json["expiredSessionsRemoved"] == expected
        assert response.headers["Cache-Control"] == "no-store"
    assert first.get("/api/moments", base_url=ORIGIN).status_code == 401
    assert second.get("/api/moments", base_url=ORIGIN).status_code == 200
    with hosted_app.app_context(), db.engine.connect() as connection:
        assert connection.scalar(select(db.func.count()).select_from(DemoSession)) == 1
        assert connection.scalar(text("SELECT count(*) FROM aura_rate_limit_buckets WHERE bucket_key=:key"), {"key": "a" * 64}) == 0


def test_vercel_cron_host_allows_only_authenticated_cleanup(vercel_hosted_app):
    client = vercel_hosted_app.test_client()
    headers = {"Authorization": "Bearer " + SECRET}
    response = client.get("/api/maintenance/cleanup", base_url=VERCEL_ORIGIN, headers=headers)
    assert response.status_code == 200
    assert response.json["expiredSessionsRemoved"] == 0
    assert response.headers["Cache-Control"] == "no-store"

    for auth in (None, "Bearer wrong", "Bearer café"):
        response = client.get(
            "/api/maintenance/cleanup",
            base_url=VERCEL_ORIGIN,
            headers={"Authorization": auth} if auth else {},
        )
        assert response.status_code == 404

    assert client.get("/api/health", base_url=VERCEL_ORIGIN).status_code == 400
    assert client.post("/api/maintenance/cleanup", base_url=VERCEL_ORIGIN, headers=headers).status_code == 400
    assert client.head("/api/maintenance/cleanup", base_url=VERCEL_ORIGIN, headers=headers).status_code == 400
    assert client.get("/api/maintenance/cleanup", base_url="https://other.vercel.app", headers=headers).status_code == 400
    assert client.get("/about", base_url=VERCEL_ORIGIN, headers=headers).status_code == 400
    assert client.get("/api/maintenance/cleanup", base_url=ORIGIN, headers=headers).status_code == 200


@pytest.mark.parametrize("host", ["", "https://aura.vercel.app", "aura.vercel.app:443", "aura.vercel.app/path", "user@aura.vercel.app", "*.vercel.app", "AURA.vercel.app", "aura.preview.vercel.app"])
def test_invalid_vercel_cron_host_fails_closed(monkeypatch, tmp_path, host):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("VERCEL_URL", host)
    with pytest.raises(ConfigurationError, match="VERCEL_URL"):
        create_app(hosted_settings(TESTING=True, AURA_DEMO_STATIC_DIR=str(tmp_path)))


def test_vercel_anonymous_reads_share_validated_peer_keys(hosted_app, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    client = hosted_app.test_client()
    for _ in range(120):
        assert client.get("/api/demo", base_url=ORIGIN,
                          headers={"x-vercel-forwarded-for": "198.51.100.1"}).status_code == 200
    assert client.get("/api/demo", base_url=ORIGIN,
                      headers={"x-vercel-forwarded-for": "198.51.100.1"}).status_code == 429
    assert client.get("/api/demo", base_url=ORIGIN,
                      headers={"x-vercel-forwarded-for": "198.51.100.2"}).status_code == 200
