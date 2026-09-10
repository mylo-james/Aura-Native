"""Explicit, fail-closed configuration for the temporary demonstration store."""

from __future__ import annotations

import os
import stat
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit
from sqlalchemy.engine import make_url


class ConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class DemoConfig:
    state_dir: Path | None
    database_path: Path | None
    key_path: Path | None
    external_origin: str
    static_dir: Path | None
    frame_origins: tuple[str, ...]
    testing: bool
    clock: object | None
    database_url: str | None = field(default=None, repr=False)
    secret_key: str | None = field(default=None, repr=False)


def same_file(a: Path, b: Path) -> bool:
    return a == b or (a.exists() and b.exists() and a.samefile(b))


def origin(value: str, *, allow_http: bool = False) -> str:
    parsed = urlsplit(value)
    try:
        parsed.port
    except ValueError as error:
        raise ConfigurationError("Invalid origin port") from error
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.path
        or parsed.query
        or parsed.fragment
        or value != f"{parsed.scheme}://{parsed.netloc}"
    ):
        raise ConfigurationError(
            "Use an exact HTTP(S) origin without a path, credentials, query or fragment"
        )
    if parsed.scheme == "http" and (
        not allow_http or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
    ):
        raise ConfigurationError(
            "HTTP requires the explicit insecure-loopback option and a loopback origin"
        )
    return value


def validate_paths(
    state_value: str | Path, extra_recovery: str | Path | None = None
) -> tuple[Path, Path, Path]:
    """Only inspect names/metadata here. Call before mkdir, chmod, key reads or SQLite."""
    state = Path(state_value).expanduser().resolve(strict=False)
    recoveries = [Path(__file__).resolve().parents[1] / "instance"]
    if extra_recovery:
        recoveries.append(Path(extra_recovery).resolve(strict=False))
    database = state / "aura-demo.sqlite3"
    key = state / "aura-demo.key"
    for recovery in recoveries:
        recovery = recovery.resolve(strict=False)
        if same_file(state, recovery) or state.is_relative_to(recovery):
            raise ConfigurationError(
                "Demo state must be separate from recovery storage"
            )
        for candidate in (database, key):
            resolved = candidate.resolve(strict=False)
            if resolved.is_relative_to(recovery):
                raise ConfigurationError("Demo file aliases recovery storage")
            for protected in (recovery / "aura.sqlite3", recovery / ".secret-key"):
                if same_file(resolved, protected):
                    raise ConfigurationError("Demo file aliases recovery storage")
    if database.is_symlink() or key.is_symlink():
        raise ConfigurationError("Demo database and key files must not be symlinks")
    if database.exists() and key.exists() and database.samefile(key):
        raise ConfigurationError("Demo database and key must be distinct files")
    return state, database, key


def load_config(values: dict | None = None) -> DemoConfig:
    values = values or {}

    def get(name: str, default=None):
        return values[name] if name in values else os.environ.get(name, default)

    testing = bool(values.get("TESTING", False))
    state_value = get("AURA_DEMO_STATE_DIR")
    external = get("AURA_EXTERNAL_ORIGIN")
    database_url = get("AURA_DATABASE_URL")
    if not external or (not state_value and not database_url):
        raise ConfigurationError(
            "AURA_EXTERNAL_ORIGIN and an explicit Aura storage mode are required"
        )
    allow_http = get("AURA_ALLOW_INSECURE_LOOPBACK") in (True, "1")
    external = origin(external, allow_http=allow_http)
    secret_key = None
    if database_url:
        if state_value:
            raise ConfigurationError("Choose one Aura storage mode")
        try:
            parsed = make_url(database_url)
            if parsed.drivername != "postgresql+psycopg" or not parsed.database:
                raise ValueError("unsupported database")
            if not testing and (not parsed.host or not parsed.username or not parsed.password):
                raise ValueError("missing database configuration")
        except Exception:
            raise ConfigurationError("Use an explicit Aura PostgreSQL connection") from None
        secret_key = get("AURA_SECRET_KEY")
        if not isinstance(secret_key, str) or len(secret_key) < 32:
            raise ConfigurationError("AURA_SECRET_KEY must contain at least 32 characters")
        state = database = key = None
    else:
        state, database, key = validate_paths(
            state_value, values.get("AURA_DEMO_RECOVERY_DIR")
        )
    static_value = get("AURA_DEMO_STATIC_DIR")
    static = Path(static_value).resolve() if static_value else None
    frames = tuple(
        origin(item.strip(), allow_http=allow_http)
        for item in get("AURA_FRAME_ANCESTORS", "").split(",")
        if item.strip()
    )
    return DemoConfig(
        state, database, key, external, static, frames, testing, values.get("NOW"),
        database_url, secret_key,
    )


def require_state(config: DemoConfig) -> str:
    if config.database_url:
        return config.secret_key
    for path, mode in (
        (config.state_dir, 0o700),
        (config.key_path, 0o600),
        (config.database_path, 0o600),
    ):
        if not path.exists() or stat.S_IMODE(path.stat().st_mode) != mode:
            raise ConfigurationError(
                f"{path.name} must exist with permissions {mode:04o}; initialize the demo state explicitly"
            )
    if (
        not config.state_dir.is_dir()
        or not config.database_path.is_file()
        or not config.key_path.is_file()
    ):
        raise ConfigurationError("Invalid demo state file type")
    key = config.key_path.read_text(encoding="ascii").strip()
    if len(key) < 32:
        raise ConfigurationError("The demo signing key is invalid")
    return key
