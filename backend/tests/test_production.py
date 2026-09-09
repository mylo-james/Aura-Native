"""Filesystem effects and production HTTP policy, using isolated stores only."""

import os
import sqlite3
from unittest.mock import patch

import pytest

from aura_demo import create_app
from aura_demo.config import ConfigurationError


def settings(tmp_path, **values):
    return {
        "AURA_DEMO_STATE_DIR": str(tmp_path / "state"),
        "AURA_EXTERNAL_ORIGIN": "https://aura.example.test",
        "AURA_DEMO_STATIC_DIR": str(tmp_path / "export"),
        **values,
    }


def export(tmp_path):
    root = tmp_path / "export"
    root.mkdir()
    (root / "index.html").write_text("<!doctype html><title>Aura</title><h1>Aura</h1>")
    (root / "_expo").mkdir()
    (root / "_expo" / ("entry-" + "a" * 32 + ".js")).write_text(
        "/* portable static bundle */" * 300
    )
    return root


@pytest.mark.parametrize(
    "alias",
    ["directory", "symlink", "nested", "db-hardlink", "key-hardlink", "db-symlink"],
)
def test_recovery_alias_is_rejected_before_all_effects(tmp_path, alias):
    recovery = tmp_path / "recovery"
    recovery.mkdir()
    database = recovery / "aura.sqlite3"
    database.write_bytes(b"recovery-db-sentinel")
    key = recovery / ".secret-key"
    key.write_bytes(b"recovery-key-sentinel")
    state = tmp_path / "state"
    if alias == "directory":
        state = recovery
    elif alias == "nested":
        state = recovery / "nested"
    elif alias == "symlink":
        state.symlink_to(recovery, target_is_directory=True)
    else:
        state.mkdir()
        if alias == "db-hardlink":
            os.link(database, state / "aura-demo.sqlite3")
        if alias == "key-hardlink":
            os.link(key, state / "aura-demo.key")
        if alias == "db-symlink":
            (state / "aura-demo.sqlite3").symlink_to(database)
    before = {p: (p.read_bytes(), p.stat().st_mode) for p in [database, key]}
    with (
        patch("aura_demo.app.prepare_state") as effects,
        patch("aura_demo.app.db.init_app") as connect,
    ):
        with pytest.raises(ConfigurationError):
            create_app(
                settings(
                    tmp_path,
                    AURA_DEMO_STATE_DIR=str(state),
                    AURA_DEMO_RECOVERY_DIR=str(recovery),
                ),
                initialize=True,
            )
        effects.assert_not_called()
        connect.assert_not_called()
    assert {p: (p.read_bytes(), p.stat().st_mode) for p in [database, key]} == before


def test_normal_start_requires_explicit_key_schema_and_export(tmp_path):
    config = settings(tmp_path)
    with pytest.raises(ConfigurationError):
        create_app(config)
    assert not (tmp_path / "state").exists()
    initialized = create_app(config, initialize=True)
    state = tmp_path / "state"
    assert state.stat().st_mode & 0o777 == 0o700
    assert all(
        (state / name).stat().st_mode & 0o777 == 0o600
        for name in ["aura-demo.key", "aura-demo.sqlite3"]
    )
    with pytest.raises(ConfigurationError):
        create_app(config)
    export(tmp_path)
    create_app(config)
    with initialized.app_context():
        from aura_demo.db import db

        db.engine.dispose()
    connection = sqlite3.connect(state / "aura-demo.sqlite3")
    connection.execute("UPDATE alembic_version SET version_num='wrong'")
    connection.commit()
    connection.close()
    with pytest.raises(ConfigurationError):
        create_app(config)


@pytest.mark.parametrize(
    "bad",
    [
        "http://aura.example.test",
        "https://user:pass@aura.example.test",
        "https://aura.example.test/path",
        "https://aura.example.test?query=1",
        "https://aura.example.test#fragment",
    ],
)
def test_invalid_origin_fails_before_state_creation(tmp_path, bad):
    with pytest.raises(ConfigurationError):
        create_app(settings(tmp_path, AURA_EXTERNAL_ORIGIN=bad), initialize=True)
    assert not (tmp_path / "state").exists()


def test_production_cookie_host_csrf_assets_compression_and_api_policy(tmp_path):
    export(tmp_path)
    app = create_app(
        settings(tmp_path, AURA_FRAME_ANCESTORS="https://portfolio.example.test"),
        initialize=True,
    )
    client = app.test_client()
    origin = "https://aura.example.test"
    response = client.get("/api/demo", base_url=origin)
    cookie = response.headers["Set-Cookie"]
    assert cookie.startswith("__Host-aura-demo=")
    assert (
        all(flag in cookie for flag in ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"])
        and "Domain=" not in cookie
    )
    token = response.json["csrfToken"]
    assert (
        client.post(
            "/api/demo",
            base_url=origin,
            json={"timezone": "UTC"},
            headers={"Origin": origin, "X-CSRFToken": token},
        ).status_code
        == 201
    )
    active = client.get("/api/demo", base_url=origin)
    assert (
        "Set-Cookie" not in active.headers
    )  # Absolute lifetime is not refreshed on ordinary reads.
    assert (
        client.get("/api/moments", base_url="https://evil.example.test").status_code
        == 400
    )
    assert (
        client.post(
            "/api/demo/reset",
            base_url=origin,
            json={"confirm": True},
            headers={
                "Origin": "https://evil.example.test",
                "X-CSRFToken": active.json["csrfToken"],
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/demo/reset",
            base_url=origin,
            json={"confirm": True},
            headers={"Origin": origin},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/demo/reset",
            base_url=origin,
            data="x" * 17000,
            content_type="application/json",
            headers={"Origin": origin, "X-CSRFToken": active.json["csrfToken"]},
        ).status_code
        == 413
    )
    for route in [
        "/",
        "/check-in",
        "/moments",
        "/moments/00000000-0000-4000-8000-000000000000",
        "/patterns",
        "/about",
    ]:
        page = client.get(route, base_url=origin)
        assert page.status_code == 200 and page.mimetype == "text/html"
        assert (
            "frame-ancestors 'self' https://portfolio.example.test"
            in page.headers["Content-Security-Policy"]
        )
        assert (
            "style-src 'self' 'unsafe-inline'"
            in page.headers["Content-Security-Policy"]
        )
        assert "unsafe-eval" not in page.headers["Content-Security-Policy"]
    for route in ["/api/unknown", "/api/session", "/api/mood", "/api/follow"]:
        missing = client.get(route, base_url=origin)
        assert (
            missing.status_code == 404
            and missing.is_json
            and missing.headers["Cache-Control"] == "no-store"
        )
    assert client.get("/missing.js", base_url=origin).status_code == 404
    assert client.get("/assets/missing.png", base_url=origin).status_code == 404
    assert client.get("/arbitrary-page", base_url=origin).status_code == 404
    asset = client.get(
        "/_expo/entry-" + "a" * 32 + ".js",
        base_url=origin,
        headers={"Accept-Encoding": "gzip"},
    )
    assert asset.status_code == 200 and asset.headers["Content-Encoding"] == "gzip"
    assert (
        "Accept-Encoding" in asset.headers["Vary"]
        and "immutable" in asset.headers["Cache-Control"]
    )
    assert asset.headers["X-Content-Type-Options"] == "nosniff"
    assert len(asset.data) < len("/* portable static bundle */" * 300)


def test_failed_operation_commit_rolls_back_entire_moment(tmp_path, monkeypatch):
    from sqlalchemy.orm import Session
    from aura_demo.db import IdempotencyOperation

    app = create_app(settings(tmp_path), initialize=True)
    client = app.test_client()
    origin = "https://aura.example.test"
    token = client.get("/api/demo", base_url=origin).json["csrfToken"]
    token = client.post(
        "/api/demo",
        base_url=origin,
        json={"timezone": "UTC"},
        headers={"Origin": origin, "X-CSRFToken": token},
    ).json["csrfToken"]
    original_add = Session.add

    def failing_add(self, instance, *args, **kwargs):
        if isinstance(instance, IdempotencyOperation):
            raise RuntimeError("Simulated operation store failure")
        return original_add(self, instance, *args, **kwargs)

    monkeypatch.setattr(Session, "add", failing_add)
    response = client.post(
        "/api/moments",
        base_url=origin,
        json={"mood": 3, "operationId": "00000000-0000-4000-8000-000000000000"},
        headers={"Origin": origin, "X-CSRFToken": token},
    )
    assert response.status_code == 500
    result = client.get("/api/patterns?days=30", base_url=origin)
    assert result.json["count"] == 24
