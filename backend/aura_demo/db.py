"""The demo schema, using SQLAlchemy with a separate Alembic migration lineage."""

from contextlib import contextmanager
import sqlite3

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint, ForeignKey, Index, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

SCHEMA_REVISION = "0002_rate_limits"
db = SQLAlchemy()


@event.listens_for(Engine, "connect")
def sqlite_settings(connection, _record):
    if not isinstance(connection, sqlite3.Connection):
        return
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


class DemoSession(db.Model):
    __tablename__ = "demo_sessions"
    id: Mapped[str] = mapped_column(primary_key=True)
    bootstrap_hash: Mapped[str] = mapped_column(nullable=False, unique=True)
    generation: Mapped[str] = mapped_column(nullable=False, unique=True)
    timezone: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[str] = mapped_column(nullable=False)
    expires_at: Mapped[str] = mapped_column(nullable=False, index=True)


class Moment(db.Model):
    __tablename__ = "moments"
    __table_args__ = (
        CheckConstraint("mood BETWEEN 1 AND 5", name="moment_mood"),
        CheckConstraint("length(title) <= 50", name="moment_title"),
        CheckConstraint("length(body) <= 2000", name="moment_body"),
        CheckConstraint("version >= 1", name="moment_version"),
        Index("moments_session_created", "demo_session_id", "created_at", "id"),
    )
    id: Mapped[str] = mapped_column(primary_key=True)
    demo_session_id: Mapped[str] = mapped_column(
        ForeignKey("demo_sessions.id", ondelete="CASCADE"), nullable=False
    )
    mood: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[str] = mapped_column(nullable=False)
    updated_at: Mapped[str] = mapped_column(nullable=False)
    version: Mapped[int] = mapped_column(nullable=False, default=1)
    influences: Mapped[list["MomentInfluence"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, lazy="selectin"
    )


class MomentInfluence(db.Model):
    __tablename__ = "moment_influences"
    __table_args__ = (
        CheckConstraint("influence BETWEEN 1 AND 9", name="influence_range"),
    )
    moment_id: Mapped[str] = mapped_column(
        ForeignKey("moments.id", ondelete="CASCADE"), primary_key=True
    )
    influence: Mapped[int] = mapped_column(primary_key=True)


class IdempotencyOperation(db.Model):
    __tablename__ = "idempotency_operations"
    demo_session_id: Mapped[str] = mapped_column(
        ForeignKey("demo_sessions.id", ondelete="CASCADE"), primary_key=True
    )
    operation_id: Mapped[str] = mapped_column(primary_key=True)
    method: Mapped[str] = mapped_column(nullable=False)
    target_id: Mapped[str] = mapped_column(nullable=False)
    payload_hash: Mapped[str] = mapped_column(nullable=False)
    response_json: Mapped[str] = mapped_column(nullable=False)


# The demo deliberately serializes its small mutation workload. SQLite needs a writer
# reservation; PostgreSQL uses a transaction-scoped advisory lock so separate functions
# preserve the same capacity, idempotency, ownership, and version guarantees.
_POSTGRES_DEMO_WRITE_LOCK = 41_028_501


@contextmanager
def atomic():
    """Serialize a demo mutation before capacity, ownership, or version reads."""
    with Session(db.engine, expire_on_commit=False) as transaction:
        connection = transaction.connection()
        if connection.dialect.name == "sqlite":
            connection.exec_driver_sql("BEGIN IMMEDIATE")
        elif connection.dialect.name == "postgresql":
            transaction.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": _POSTGRES_DEMO_WRITE_LOCK},
            )
        try:
            yield transaction
            transaction.commit()
        except BaseException:
            transaction.rollback()
            raise
