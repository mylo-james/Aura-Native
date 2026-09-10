"""Actual PostgreSQL coverage for Aura's native Flask-Limiter storage extension."""

from __future__ import annotations

import importlib.util
import os
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from itertools import repeat
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from limits.errors import StorageError
from limits import parse
from limits.storage import storage_from_string
from limits.strategies import FixedWindowRateLimiter
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from aura_demo.postgres_limits import PostgresFixedWindowStorage

DATABASE_URL = os.environ.get("AURA_LIMITS_TEST_DATABASE_URL")


def isolated_postgres_test_url(value: str | None) -> bool:
    if not value:
        return False
    try:
        parsed = make_url(value)
    except Exception:
        return False
    host = parsed.query.get("host", "")
    return (
        parsed.drivername.startswith("postgresql+")
        and bool(parsed.database)
        and parsed.database.endswith("_test")
        and host.startswith("/private/tmp/")
        and ".." not in Path(host).parts
    )


pytestmark = pytest.mark.skipif(
    not isolated_postgres_test_url(DATABASE_URL),
    reason="Set AURA_LIMITS_TEST_DATABASE_URL to an isolated local PostgreSQL database ending in _test.",
)


def migration_module():
    path = Path(__file__).resolve().parents[1] / "migrations-demo" / "versions" / "0002_rate_limits.py"
    spec = importlib.util.spec_from_file_location("aura_rate_limits_migration", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture()
def engine():
    engine = create_engine(
        DATABASE_URL,
        connect_args={"connect_timeout": 5},
        pool_timeout=5,
    )
    migration = migration_module()
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS aura_rate_limit_buckets"))
        context = MigrationContext.configure(connection)
        original = migration.op
        migration.op = Operations(context)
        try:
            migration.upgrade()
        finally:
            migration.op = original
    yield engine
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE IF EXISTS aura_rate_limit_buckets"))
    engine.dispose()


@pytest.fixture()
def storage(engine):
    registered = storage_from_string(
        "aura-postgres://",
        engine=engine,
        key_salt="test-stable-app-secret",
        query_timeout_ms=1_000,
        wrap_exceptions=True,
    )
    assert isinstance(registered, PostgresFixedWindowStorage)
    return registered


def process_hit(database_url: str, key: str) -> bool:
    """Use another Python process and engine to prove the database shares the cap."""
    engine = create_engine(database_url, connect_args={"connect_timeout": 5}, pool_timeout=5)
    try:
        storage = PostgresFixedWindowStorage(
            "aura-postgres://",
            engine=engine,
            key_salt="test-stable-app-secret",
            query_timeout_ms=1_000,
            wrap_exceptions=True,
        )
        return FixedWindowRateLimiter(storage).hit(parse("2/minute"), key)
    finally:
        engine.dispose()


def test_fixed_window_contract_hides_raw_principals_and_uses_database_expiry(storage, engine):
    key = "LIMITER/203.0.113.45/write"
    limiter = FixedWindowRateLimiter(storage)
    item = parse("2/minute")
    assert limiter.hit(item, key)
    assert limiter.hit(item, key)
    assert not limiter.hit(item, key)
    limiter_key = item.key_for(key)
    assert storage.get(limiter_key) == 3
    assert storage.get_expiry(limiter_key) > 0
    with engine.connect() as connection:
        bucket, count = connection.execute(
            text("SELECT bucket_key, count FROM aura_rate_limit_buckets")
        ).one()
    assert bucket != key
    assert len(bucket) == 64
    assert count == 3
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE aura_rate_limit_buckets SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second'")
        )
    assert storage.get(limiter_key) == 0
    assert storage.incr(limiter_key, 60) == 1


def test_atomic_increments_and_explicit_maintenance_api(storage, engine):
    key = "LIMITER/demo-principal/moments"
    with ThreadPoolExecutor(max_workers=8) as pool:
        values = list(pool.map(lambda _: storage.incr(key, 60), range(24)))
    assert sorted(values) == list(range(1, 25))
    assert storage.get(key) == 24
    assert storage.check() is True
    storage.clear(key)
    assert storage.get(key) == 0
    storage.incr("expired", 60)
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE aura_rate_limit_buckets SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second'")
        )
    assert storage.prune_expired() == 1
    storage.incr("one", 60)
    storage.incr("two", 60)
    assert storage.reset() == 2


def test_two_independent_processes_share_one_fixed_window_cap(storage):
    key = "LIMITER/shared-admission"
    limiter_key = parse("2/minute").key_for(key)
    storage.clear(limiter_key)
    with ProcessPoolExecutor(max_workers=2) as pool:
        accepted = list(pool.map(process_hit, repeat(DATABASE_URL, 3), repeat(key, 3)))
    assert sorted(accepted) == [False, True, True]
    assert storage.get(limiter_key) == 3


def test_database_connection_failure_is_reported_and_never_falls_back(storage):
    unavailable = create_engine(
        make_url(DATABASE_URL).set(database="aura_limits_missing_test"),
        connect_args={"connect_timeout": 1},
        pool_timeout=1,
    )
    try:
        broken = PostgresFixedWindowStorage(
            "aura-postgres://",
            engine=unavailable,
            key_salt="test-stable-app-secret",
            query_timeout_ms=1_000,
            wrap_exceptions=True,
        )
        with pytest.raises(StorageError):
            broken.check()
    finally:
        unavailable.dispose()
