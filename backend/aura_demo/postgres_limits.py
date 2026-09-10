"""PostgreSQL fixed-window storage for Flask-Limiter's documented limits API."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

from limits.storage import Storage
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError


class PostgresFixedWindowStorage(Storage):
    """A fail-closed, database-clocked fixed-window ``limits`` storage backend.

    ``engine`` must use finite connection and pool timeouts. Every query also sets
    PostgreSQL's transaction-local statement timeout. ``key_salt`` is stable app
    secret material supplied by Flask-Limiter's ``storage_options``. It hashes the
    opaque key produced by Flask-Limiter before it reaches the database.
    """

    STORAGE_SCHEME = ["aura-postgres"]
    _TABLE = "aura_rate_limit_buckets"

    def __init__(
        self,
        uri: str | None = None,
        wrap_exceptions: bool = False,
        *,
        engine: Engine,
        key_salt: str | bytes,
        query_timeout_ms: int = 5_000,
        **options: Any,
    ) -> None:
        if engine.dialect.name != "postgresql":
            raise ValueError("Aura rate-limit storage requires a PostgreSQL engine")
        if not isinstance(key_salt, (str, bytes)) or not key_salt:
            raise ValueError("Aura rate-limit storage requires stable key_salt")
        if not isinstance(query_timeout_ms, int) or not 1 <= query_timeout_ms <= 60_000:
            raise ValueError("Aura rate-limit query_timeout_ms must be finite and between 1 and 60000")
        self.engine = engine
        self.key_salt = key_salt.encode("utf-8") if isinstance(key_salt, str) else key_salt
        self.query_timeout_ms = query_timeout_ms
        super().__init__(uri, wrap_exceptions=wrap_exceptions, **options)

    @property
    def base_exceptions(self) -> type[Exception] | tuple[type[Exception], ...]:
        return SQLAlchemyError

    def _bucket_key(self, key: str) -> str:
        return hmac.new(self.key_salt, key.encode("utf-8"), hashlib.sha256).hexdigest()

    def _run(self, statement, values: dict[str, Any] | None = None):
        with self.engine.begin() as connection:
            connection.execute(text(f"SET LOCAL statement_timeout = '{self.query_timeout_ms}ms'"))
            return connection.execute(statement, values or {})

    def incr(self, key: str, expiry: int, amount: int = 1) -> int:
        if not isinstance(expiry, int) or expiry < 1 or not isinstance(amount, int) or amount < 1:
            raise ValueError("Rate-limit expiry and amount must be positive integers")
        result = self._run(
            text(
                f"""
                INSERT INTO {self._TABLE} (bucket_key, count, expires_at)
                VALUES (:bucket_key, :amount, CURRENT_TIMESTAMP + (:expiry * INTERVAL '1 second'))
                ON CONFLICT (bucket_key) DO UPDATE SET
                  count = CASE
                    WHEN {self._TABLE}.expires_at <= CURRENT_TIMESTAMP THEN EXCLUDED.count
                    ELSE {self._TABLE}.count + EXCLUDED.count
                  END,
                  expires_at = CASE
                    WHEN {self._TABLE}.expires_at <= CURRENT_TIMESTAMP THEN EXCLUDED.expires_at
                    ELSE {self._TABLE}.expires_at
                  END
                RETURNING count
                """
            ),
            {"bucket_key": self._bucket_key(key), "amount": amount, "expiry": expiry},
        )
        return int(result.scalar_one())

    def get(self, key: str) -> int:
        result = self._run(
            text(
                f"SELECT count FROM {self._TABLE} "
                "WHERE bucket_key = :bucket_key AND expires_at > CURRENT_TIMESTAMP"
            ),
            {"bucket_key": self._bucket_key(key)},
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else 0

    def get_expiry(self, key: str) -> float:
        result = self._run(
            text(
                f"""
                SELECT COALESCE(
                  (SELECT EXTRACT(EPOCH FROM expires_at) FROM {self._TABLE}
                   WHERE bucket_key = :bucket_key AND expires_at > CURRENT_TIMESTAMP),
                  EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)
                )
                """
            ),
            {"bucket_key": self._bucket_key(key)},
        )
        return float(result.scalar_one())

    def check(self) -> bool:
        self._run(text("SELECT 1"))
        return True

    def reset(self) -> int | None:
        result = self._run(text(f"DELETE FROM {self._TABLE}"))
        return result.rowcount

    def clear(self, key: str) -> None:
        self._run(
            text(f"DELETE FROM {self._TABLE} WHERE bucket_key = :bucket_key"),
            {"bucket_key": self._bucket_key(key)},
        )

    def prune_expired(self) -> int:
        """Explicit maintenance hook for the deployed daily cleanup job."""
        result = self._run(
            text(f"DELETE FROM {self._TABLE} WHERE expires_at <= CURRENT_TIMESTAMP")
        )
        return result.rowcount
