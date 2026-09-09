"""Black-box contract tests for the isolated Aura demo API.

These exercise the published HTTP contract against a real temporary SQLite
database.  They intentionally do not import recovery application code.
"""

from __future__ import annotations

import hashlib
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pytest

from aura_demo import create_app
from aura_demo import domain
from aura_demo.db import DemoSession, IdempotencyOperation, Moment, db
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

ORIGIN = "http://127.0.0.1:3111"


def make_app(tmp_path: Path, *, now=None, **extra):
    overrides = {
        "TESTING": True,
        "AURA_DEMO_STATE_DIR": str(tmp_path / "demo-state"),
        "AURA_EXTERNAL_ORIGIN": ORIGIN,
        "AURA_ALLOW_INSECURE_LOOPBACK": "1",
        "NOW": now,
        **extra,
    }
    return create_app(overrides, initialize=True)


@pytest.fixture
def app(tmp_path):
    return make_app(tmp_path)


def request(client, method, path, **kwargs):
    headers = {"Host": "127.0.0.1:3111", **kwargs.pop("headers", {})}
    return client.open(path, method=method, base_url=ORIGIN, headers=headers, **kwargs)


def csrf(client):
    response = request(client, "GET", "/api/demo")
    assert response.status_code == 200
    return response.get_json()["csrfToken"]


def start(client, timezone="America/Chicago"):
    return request(
        client,
        "POST",
        "/api/demo",
        json={"timezone": timezone},
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    )


def operation(**changes):
    return {
        "mood": 3,
        "influences": [1, 6],
        "title": "A small title",
        "body": "A retained fictional reflection.",
        "operationId": str(uuid4()),
        **changes,
    }


def create_moment(client, **changes):
    return request(
        client,
        "POST",
        "/api/moments",
        json=operation(**changes),
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    )


def assert_error(response, status, code):
    assert response.status_code == status, response.get_json()
    payload = response.get_json()
    assert payload["error"]["code"] == code
    assert payload["error"]["message"]
    assert payload["error"]["requestId"]


def test_real_state_is_private_and_recovery_database_is_untouched(tmp_path):
    recovery = tmp_path / "instance" / "aura.sqlite3"
    recovery.parent.mkdir()
    recovery.write_bytes(b"recovery database sentinel")
    before = hashlib.sha256(recovery.read_bytes()).hexdigest()
    with pytest.raises(Exception):
        make_app(
            tmp_path,
            AURA_DEMO_STATE_DIR=str(recovery.parent),
            AURA_DEMO_RECOVERY_DIR=str(recovery.parent),
        )
    assert hashlib.sha256(recovery.read_bytes()).hexdigest() == before
    with pytest.raises(Exception):
        make_app(
            tmp_path,
            AURA_DEMO_STATE_DIR=str(tmp_path / "missing"),
            AURA_EXTERNAL_ORIGIN=None,
        )


def test_generic_database_and_secret_environment_variables_are_ignored(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("DATABASE_URL", "sqlite:////definitely-not-aura.sqlite3")
    monkeypatch.setenv("SECRET_KEY", "generic-secret-must-not-be-used")
    app = make_app(tmp_path)
    config = app.config["DEMO_CONFIG"]
    assert config.database_path == (tmp_path / "demo-state" / "aura-demo.sqlite3")
    assert app.config["SECRET_KEY"] != "generic-secret-must-not-be-used"


def test_guest_cookie_isolated_reset_revokes_old_principal_and_keeps_other_client(app):
    first, second = app.test_client(), app.test_client()
    assert start(first).status_code == 201
    assert start(second).status_code == 201
    cookie_name = app.config["SESSION_COOKIE_NAME"]
    old_cookie = first.get_cookie(cookie_name, domain="127.0.0.1")
    assert old_cookie is not None
    kept = create_moment(second)
    assert kept.status_code == 201
    reset = request(
        first,
        "POST",
        "/api/demo/reset",
        json={"confirm": True},
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(first)},
    )
    assert reset.status_code == 201
    assert request(second, "GET", "/api/moments").status_code == 200
    stale = app.test_client()
    # A copied old cookie must be rejected after reset, rather than becoming the new principal.
    stale.set_cookie(cookie_name, old_cookie.value, domain="127.0.0.1")
    assert_error(request(stale, "GET", "/api/moments"), 401, "session_ended")


@pytest.mark.parametrize("bad", [True, 0, 6, "3", 3.0])
def test_mood_is_strict_integer(app, bad):
    client = app.test_client()
    assert start(client).status_code == 201
    assert_error(create_moment(client, mood=bad), 400, "validation")


@pytest.mark.parametrize(
    "field,value",
    [
        ("influences", [1, 1]),
        ("influences", [0]),
        ("influences", [True]),
        ("title", "x" * 51),
        ("body", "x" * 2001),
        ("unknown", "nope"),
    ],
)
def test_strict_request_shape_and_unicode_bounds(app, field, value):
    client = app.test_client()
    assert start(client).status_code == 201
    assert_error(create_moment(client, **{field: value}), 400, "validation")


def test_csrf_origin_ownership_and_legacy_routes(app):
    first, second = app.test_client(), app.test_client()
    assert start(first).status_code == start(second).status_code == 201
    created = create_moment(first)
    assert created.status_code == 201
    moment_id = created.get_json()["id"]
    assert_error(
        request(second, "GET", f"/api/moments/{moment_id}"), 404, "moment_missing"
    )
    assert_error(
        request(
            first,
            "POST",
            "/api/moments",
            json=operation(),
            headers={"Origin": "https://example.invalid", "X-CSRFToken": csrf(first)},
        ),
        403,
        "origin",
    )
    assert_error(
        request(
            first, "POST", "/api/moments", json=operation(), headers={"Origin": ORIGIN}
        ),
        403,
        "csrf",
    )
    for route in ("/api/session", "/api/mood", "/api/follow", "/api/unknown"):
        assert_error(request(first, "GET", route), 404, "http_404")


def test_write_idempotency_version_conflict_and_rollback(app, monkeypatch):
    client = app.test_client()
    assert start(client).status_code == 201
    payload = operation()
    first = request(
        client,
        "POST",
        "/api/moments",
        json=payload,
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    )
    repeat = request(
        client,
        "POST",
        "/api/moments",
        json=payload,
        headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
    )
    assert first.status_code == 201 and repeat.status_code == 200
    assert first.get_json()["id"] == repeat.get_json()["id"]
    changed = {**payload, "title": "Changed content"}
    assert_error(
        request(
            client,
            "POST",
            "/api/moments",
            json=changed,
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        ),
        409,
        "operation_conflict",
    )
    moment = first.get_json()
    update = operation(mood=5, expectedVersion=moment["version"])
    assert (
        request(
            client,
            "PUT",
            f"/api/moments/{moment['id']}",
            json=update,
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        ).status_code
        == 200
    )
    stale = operation(expectedVersion=moment["version"])
    assert_error(
        request(
            client,
            "PUT",
            f"/api/moments/{moment['id']}",
            json=stale,
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        ),
        409,
        "version_conflict",
    )


def test_keyset_cursor_is_principal_bound_and_ordering_is_stable(app):
    client, foreign = app.test_client(), app.test_client()
    assert start(client).status_code == start(foreign).status_code == 201
    for index in range(4):
        assert create_moment(client, title=f"entry {index}").status_code == 201
    first = request(client, "GET", "/api/moments?limit=2").get_json()
    assert len(first["items"]) == 2 and first["nextCursor"]
    assert_error(
        request(foreign, "GET", f"/api/moments?cursor={first['nextCursor']}"),
        400,
        "cursor",
    )
    newer = create_moment(client, title="new since page one").get_json()
    second = request(
        client, "GET", f"/api/moments?limit=50&cursor={first['nextCursor']}"
    ).get_json()
    ids = [item["id"] for item in second["items"]]
    assert newer["id"] not in ids
    assert not set(ids).intersection(item["id"] for item in first["items"])


@pytest.mark.parametrize(
    "zone,clock",
    [
        ("America/New_York", datetime(2026, 3, 8, 16, tzinfo=UTC)),
        ("America/New_York", datetime(2026, 11, 1, 17, tzinfo=UTC)),
    ],
)
def test_patterns_reports_timezone_calendar_window_and_honest_denominator(
    tmp_path, zone, clock
):
    app = make_app(tmp_path, now=lambda: clock)
    client = app.test_client()
    assert start(client, zone).status_code == 201
    summary = request(client, "GET", "/api/patterns?days=30").get_json()
    assert summary["timezone"] == zone and summary["days"] == 30
    assert summary["startDate"] <= summary["endDate"]
    assert summary["denominator"] == summary["count"]
    assert sum(row["count"] for row in summary["moods"]) == summary["count"]
    assert {row["id"] for row in summary["influences"]} == set(range(1, 10))
    assert summary["state"] in {"empty", "insufficient", "ready"}


def test_absolute_expiry_and_structured_rate_error(tmp_path):
    clock = [datetime(2026, 9, 9, tzinfo=UTC)]
    app = make_app(tmp_path, now=lambda: clock[0])
    client = app.test_client()
    assert start(client).status_code == 201
    clock[0] += timedelta(hours=24, seconds=1)
    assert_error(request(client, "GET", "/api/moments"), 401, "session_ended")


def clone_cookie(app, cookie):
    client = app.test_client()
    client.set_cookie(
        app.config["SESSION_COOKIE_NAME"], cookie.value, domain="127.0.0.1"
    )
    return client


def test_concurrent_bootstrap_nonce_creates_one_principal(app):
    initial = app.test_client()
    csrf(initial)  # Establish exactly one signed bootstrap nonce.
    cookie = initial.get_cookie(app.config["SESSION_COOKIE_NAME"], domain="127.0.0.1")
    assert cookie is not None

    def create():
        client = clone_cookie(app, cookie)
        return start(client).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(lambda _: create(), range(2)))
    assert sorted(statuses) == [200, 201]
    with app.app_context(), Session(db.engine) as transaction:
        assert len(list(transaction.scalars(select(DemoSession)))) == 1


def test_concurrent_duplicate_write_is_one_moment(app):
    initial = app.test_client()
    assert start(initial).status_code == 201
    cookie = initial.get_cookie(app.config["SESSION_COOKIE_NAME"], domain="127.0.0.1")
    assert cookie is not None
    payload = operation()

    def write():
        client = clone_cookie(app, cookie)
        token = csrf(client)
        response = request(
            client,
            "POST",
            "/api/moments",
            json=payload,
            headers={"Origin": ORIGIN, "X-CSRFToken": token},
        )
        return response.status_code, response.get_json()["id"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: write(), range(2)))
    assert sorted(status for status, _ in results) == [200, 201]
    assert len({identity for _, identity in results}) == 1


def test_failed_seed_rolls_back_session_and_fixture(tmp_path, monkeypatch):
    app = make_app(tmp_path)
    client = app.test_client()

    def fail_seed(*_args, **_kwargs):
        raise RuntimeError("test seed failure")

    monkeypatch.setattr(domain, "seed", fail_seed)
    response = start(client)
    assert_error(response, 500, "internal")
    with app.app_context(), Session(db.engine) as transaction:
        assert list(transaction.scalars(select(DemoSession))) == []


def test_session_moment_capacity_is_enforced_without_eviction(tmp_path):
    app = make_app(tmp_path, RATELIMIT_ENABLED=False)
    client = app.test_client()
    assert start(client).status_code == 201
    # The fixture contains 24 entries, so 76 valid writes reach the declared 100 limit.
    for index in range(76):
        assert create_moment(client, title=f"capacity {index}").status_code == 201
    assert_error(create_moment(client, title="one too many"), 429, "moment_capacity")
    assert (
        len(request(client, "GET", "/api/moments?limit=50").get_json()["items"]) == 50
    )


def test_active_session_capacity_rejects_new_demo_without_eviction(tmp_path):
    app = make_app(tmp_path, RATELIMIT_ENABLED=False)
    instant = "2026-09-09T00:00:00.000000Z"
    expires = "2026-09-10T00:00:00.000000Z"
    with app.app_context(), Session(db.engine) as transaction:
        transaction.add_all(
            DemoSession(
                id=f"session-{index}",
                bootstrap_hash=f"bootstrap-{index}",
                generation=f"generation-{index}",
                timezone="UTC",
                created_at=instant,
                expires_at=expires,
            )
            for index in range(500)
        )
        transaction.commit()
    client = app.test_client()
    assert_error(start(client), 429, "demo_capacity")
    with app.app_context(), Session(db.engine) as transaction:
        assert len(list(transaction.scalars(select(DemoSession)))) == 500


@pytest.mark.parametrize(
    "clock,expected",
    [
        (datetime(2026, 3, 8, 16, tzinfo=UTC), {7: 5, 30: 24}),
        (datetime(2026, 11, 1, 17, tzinfo=UTC), {7: 5, 30: 24}),
    ],
)
def test_fixture_calendar_counts_and_dst_midnight_inclusion(tmp_path, clock, expected):
    app = make_app(tmp_path, now=lambda: clock, RATELIMIT_ENABLED=False)
    client = app.test_client()
    assert start(client, "America/New_York").status_code == 201
    baseline = {
        days: request(client, "GET", f"/api/patterns?days={days}").get_json()
        for days in (7, 30)
    }
    assert {days: result["count"] for days, result in baseline.items()} == expected
    with app.app_context(), Session(db.engine) as transaction:
        owner = transaction.scalar(select(DemoSession))
        # At spring/fall transition, UTC bounds must follow local midnight rather than 24h arithmetic.
        local_now = clock.astimezone(
            __import__("zoneinfo").ZoneInfo("America/New_York")
        )
        start_date = local_now.date() - timedelta(days=6)
        inside = datetime.combine(
            start_date, datetime.min.time(), local_now.tzinfo
        ).astimezone(UTC)
        outside = inside - timedelta(microseconds=1)
        for identity, instant in ((str(uuid4()), inside), (str(uuid4()), outside)):
            transaction.add(
                Moment(
                    id=identity,
                    demo_session_id=owner.id,
                    mood=3,
                    title=identity,
                    body="",
                    created_at=domain.stamp(instant),
                    updated_at=domain.stamp(instant),
                    version=1,
                )
            )
        transaction.commit()
    result = request(client, "GET", "/api/patterns?days=7").get_json()
    assert result["count"] == expected[7] + 1
    assert result["startDate"] == str(start_date)
    assert result["endDate"] == str(local_now.date())


def test_summary_changes_for_multi_entry_day_edit_and_delete(tmp_path):
    clock = datetime(2026, 9, 9, 16, tzinfo=UTC)
    app = make_app(tmp_path, now=lambda: clock, RATELIMIT_ENABLED=False)
    client = app.test_client()
    assert start(client, "America/Chicago").status_code == 201
    before = request(client, "GET", "/api/patterns?days=7").get_json()
    first = create_moment(client, mood=1, influences=[1]).get_json()
    second = create_moment(client, mood=2, influences=[1, 2]).get_json()
    after_create = request(client, "GET", "/api/patterns?days=7").get_json()
    assert after_create["count"] == before["count"] + 2
    assert (
        after_create["influences"][0]["count"] == before["influences"][0]["count"] + 2
    )
    updated = operation(mood=5, influences=[9], expectedVersion=first["version"])
    assert (
        request(
            client,
            "PUT",
            f"/api/moments/{first['id']}",
            json=updated,
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        ).status_code
        == 200
    )
    assert (
        request(
            client,
            "DELETE",
            f"/api/moments/{second['id']}",
            json={},
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        ).status_code
        == 204
    )
    after = request(client, "GET", "/api/patterns?days=7").get_json()
    assert after["count"] == before["count"] + 1
    assert after["moods"][4]["count"] == before["moods"][4]["count"] + 1
    assert after["influences"][8]["count"] == before["influences"][8]["count"] + 1


def test_cleanup_cli_cascades_expired_data_without_touching_another_principal(tmp_path):
    clock = [datetime(2026, 9, 9, tzinfo=UTC)]
    app = make_app(tmp_path, now=lambda: clock[0], RATELIMIT_ENABLED=False)
    expired, retained = app.test_client(), app.test_client()
    assert start(expired).status_code == start(retained).status_code == 201
    assert create_moment(expired).status_code == 201  # Includes an idempotency record.
    with app.app_context(), Session(db.engine) as transaction:
        # The first request is the older principal and is the one deliberately expired.
        owner = transaction.scalars(
            select(DemoSession).order_by(DemoSession.created_at)
        ).first()
        owner.expires_at = domain.stamp(clock[0] - timedelta(seconds=1))
        transaction.commit()
    result = app.test_cli_runner().invoke(args=["demo-cleanup"])
    assert result.exit_code == 0, result.output
    assert request(retained, "GET", "/api/moments").status_code == 200
    with app.app_context(), Session(db.engine) as transaction:
        assert len(list(transaction.scalars(select(DemoSession)))) == 1
        assert list(transaction.scalars(select(IdempotencyOperation))) == []


def test_real_sqlite_pragmas_foreign_keys_and_constraints(app):
    with app.app_context(), db.engine.connect() as connection:
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
        assert (
            connection.exec_driver_sql("PRAGMA journal_mode").scalar().lower() == "wal"
        )
        assert connection.exec_driver_sql("PRAGMA busy_timeout").scalar() >= 3000
    with app.app_context(), Session(db.engine) as transaction:
        transaction.add(
            Moment(
                id=str(uuid4()),
                demo_session_id="does-not-exist",
                mood=6,
                title="",
                body="",
                created_at=domain.stamp(datetime.now(UTC)),
                updated_at=domain.stamp(datetime.now(UTC)),
                version=1,
            )
        )
        with pytest.raises(IntegrityError):
            transaction.commit()


def test_concurrent_put_same_operation_increments_version_once(app):
    initial = app.test_client()
    assert start(initial).status_code == 201
    created = create_moment(initial).get_json()
    cookie = initial.get_cookie(app.config["SESSION_COOKIE_NAME"], domain="127.0.0.1")
    assert cookie is not None
    payload = operation(mood=5, influences=[9], expectedVersion=created["version"])

    def update():
        client = clone_cookie(app, cookie)
        response = request(
            client,
            "PUT",
            f"/api/moments/{created['id']}",
            json=payload,
            headers={"Origin": ORIGIN, "X-CSRFToken": csrf(client)},
        )
        return response.status_code, response.get_json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: update(), range(2)))
    assert [status for status, _ in outcomes] == [200, 200]
    assert (
        outcomes[0][1]["version"] == outcomes[1][1]["version"] == created["version"] + 1
    )


def test_write_rate_returns_retry_after(app):
    client = app.test_client()
    assert start(client).status_code == 201
    for index in range(30):
        assert create_moment(client, title=f"rate {index}").status_code == 201
    blocked = create_moment(client, title="rate blocked")
    assert_error(blocked, 429, "rate_limit")
    assert int(blocked.headers["Retry-After"]) >= 1
