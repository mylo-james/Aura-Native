"""Cross-process PostgreSQL proof for Aura's existing mutation contracts."""

from __future__ import annotations

import os
from concurrent.futures import ProcessPoolExecutor
from datetime import UTC, datetime, timedelta
from itertools import repeat
from multiprocessing import get_context
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from aura_demo import create_app
from aura_demo import domain
from aura_demo.db import DemoSession, IdempotencyOperation, Moment, db

ORIGIN = "http://127.0.0.1:3111"
DATABASE_URL = os.environ.get("AURA_CONTRACTS_TEST_DATABASE_URL")
SECRET = "postgres-contract-test-secret-material-0123456789"


def isolated_postgres_test_url(value: str | None) -> bool:
    if not value:
        return False
    try:
        parsed = make_url(value)
    except Exception:
        return False
    host = parsed.query.get("host", "")
    return (
        parsed.drivername == "postgresql+psycopg"
        and parsed.database == "aura_hosting_test"
        and host.startswith("/private/tmp/")
        and ".." not in Path(host).parts
    )


pytestmark = pytest.mark.skipif(
    not isolated_postgres_test_url(DATABASE_URL),
    reason="Set AURA_CONTRACTS_TEST_DATABASE_URL to the isolated local Aura PostgreSQL test database.",
)


def overrides():
    return {
        "TESTING": True,
        "AURA_DATABASE_URL": DATABASE_URL,
        "AURA_SECRET_KEY": SECRET,
        "AURA_EXTERNAL_ORIGIN": ORIGIN,
        "AURA_ALLOW_INSECURE_LOOPBACK": "1",
        "RATELIMIT_ENABLED": False,
    }


@pytest.fixture()
def app():
    engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS aura_rate_limit_buckets CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS idempotency_operations CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS moment_influences CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS moments CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS demo_sessions CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
    engine.dispose()
    app = create_app(overrides(), initialize=True)
    yield app
    with app.app_context():
        engine = db.engine
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS aura_rate_limit_buckets CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS idempotency_operations CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS moment_influences CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS moments CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS demo_sessions CASCADE"))
        connection.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
    engine.dispose()


def request(client, method, path, **kwargs):
    headers = {"Host": "127.0.0.1:3111", **kwargs.pop("headers", {})}
    return client.open(path, method=method, base_url=ORIGIN, headers=headers, **kwargs)


def csrf(client):
    response = request(client, "GET", "/api/demo")
    assert response.status_code == 200
    return response.get_json()["csrfToken"]


def start(client):
    return request(
        client,
        "POST",
        "/api/demo",
        json={"timezone": "America/Chicago"},
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    )


def operation(**changes):
    return {
        "mood": 3,
        "influences": [1, 6],
        "title": "A PostgreSQL contract moment",
        "body": "A retained fictional reflection.",
        "operationId": str(uuid4()),
        **changes,
    }


def cookie_value(app, client):
    cookie = client.get_cookie(app.config["SESSION_COOKIE_NAME"], domain="127.0.0.1")
    assert cookie is not None
    return cookie.value


def child_request(cookie, method, path, payload):
    """Run a real Aura request in a fresh process and fresh SQLAlchemy engine."""
    app = create_app(overrides(), initialize=False)
    client = app.test_client()
    client.set_cookie(app.config["SESSION_COOKIE_NAME"], cookie, domain="127.0.0.1")
    response = request(
        client,
        method,
        path,
        json=payload,
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    )
    return response.status_code, response.get_json()


def child_start(cookie):
    app = create_app(overrides(), initialize=False)
    client = app.test_client()
    client.set_cookie(app.config["SESSION_COOKIE_NAME"], cookie, domain="127.0.0.1")
    response = start(client)
    return response.status_code


def processes(function, *iterables):
    arguments = list(zip(*iterables))
    with ProcessPoolExecutor(max_workers=len(arguments), mp_context=get_context("spawn")) as pool:
        return list(pool.map(function, *zip(*arguments)))


def test_postgres_global_lock_replays_duplicate_create_once(app):
    client = app.test_client()
    assert start(client).status_code == 201
    cookie = cookie_value(app, client)
    payload = operation()
    results = processes(
        child_request,
        repeat(cookie, 2),
        repeat("POST", 2),
        repeat("/api/moments", 2),
        repeat(payload, 2),
    )
    assert sorted(status for status, _ in results) == [200, 201]
    assert len({body["id"] for _, body in results}) == 1
    with app.app_context(), Session(db.engine) as transaction:
        assert transaction.scalar(select(func.count()).select_from(IdempotencyOperation)) == 1
        assert transaction.scalar(select(func.count()).select_from(Moment)) == 25


def test_postgres_global_lock_enforces_100_moment_cap(app):
    client = app.test_client()
    assert start(client).status_code == 201
    cookie = cookie_value(app, client)
    for index in range(75):
        response = request(
            client,
            "POST",
            "/api/moments",
            json=operation(title=f"filler {index}"),
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        )
        assert response.status_code == 201
    results = processes(
        child_request,
        repeat(cookie, 2),
        repeat("POST", 2),
        repeat("/api/moments", 2),
        [operation(title="boundary one"), operation(title="boundary two")],
    )
    assert sorted(status for status, _ in results) == [201, 429]
    with app.app_context(), Session(db.engine) as transaction:
        assert transaction.scalar(select(func.count()).select_from(Moment)) == 100


def test_postgres_global_lock_replays_same_put_without_double_version(app):
    client = app.test_client()
    assert start(client).status_code == 201
    created = request(
        client,
        "POST",
        "/api/moments",
        json=operation(),
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    ).get_json()
    cookie = cookie_value(app, client)
    payload = operation(mood=5, influences=[9], expectedVersion=created["version"])
    results = processes(
        child_request,
        repeat(cookie, 2),
        repeat("PUT", 2),
        repeat(f"/api/moments/{created['id']}", 2),
        repeat(payload, 2),
    )
    assert [status for status, _ in results] == [200, 200]
    assert {body["version"] for _, body in results} == {created["version"] + 1}


def test_postgres_global_lock_enforces_500_active_demo_cap(app):
    now = domain.stamp(datetime.now(UTC))
    expires = domain.stamp(datetime.now(UTC) + timedelta(hours=1))
    with app.app_context(), Session(db.engine) as transaction:
        transaction.add_all(
            DemoSession(
                id=f"seed-{index}",
                bootstrap_hash=f"seed-bootstrap-{index}",
                generation=f"seed-generation-{index}",
                timezone="UTC",
                created_at=now,
                expires_at=expires,
            )
            for index in range(499)
        )
        transaction.commit()
    cookies = []
    for _ in range(2):
        client = app.test_client()
        csrf(client)
        cookies.append(cookie_value(app, client))
    assert sorted(processes(child_start, cookies)) == [201, 429]
    with app.app_context(), Session(db.engine) as transaction:
        assert transaction.scalar(select(func.count()).select_from(DemoSession)) == 500
