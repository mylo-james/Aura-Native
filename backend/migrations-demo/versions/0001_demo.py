"""Initial isolated demo schema. No legacy application tables or data are imported."""

from alembic import op
import sqlalchemy as sa

revision = "0001_demo"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "demo_sessions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("bootstrap_hash", sa.String(), nullable=False, unique=True),
        sa.Column("generation", sa.String(), nullable=False, unique=True),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("expires_at", sa.String(), nullable=False),
    )
    op.create_index("ix_demo_sessions_expires_at", "demo_sessions", ["expires_at"])
    op.create_table(
        "moments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "demo_session_id",
            sa.String(),
            sa.ForeignKey("demo_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mood", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("mood BETWEEN 1 AND 5", name="moment_mood"),
        sa.CheckConstraint("length(title) <= 50", name="moment_title"),
        sa.CheckConstraint("length(body) <= 2000", name="moment_body"),
        sa.CheckConstraint("version >= 1", name="moment_version"),
    )
    op.create_index(
        "moments_session_created", "moments", ["demo_session_id", "created_at", "id"]
    )
    op.create_table(
        "moment_influences",
        sa.Column(
            "moment_id",
            sa.String(),
            sa.ForeignKey("moments.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("influence", sa.Integer(), primary_key=True),
        sa.CheckConstraint("influence BETWEEN 1 AND 9", name="influence_range"),
    )
    op.create_table(
        "idempotency_operations",
        sa.Column(
            "demo_session_id",
            sa.String(),
            sa.ForeignKey("demo_sessions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("operation_id", sa.String(), primary_key=True),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("payload_hash", sa.String(), nullable=False),
        sa.Column("response_json", sa.String(), nullable=False),
    )


def downgrade():
    for table in [
        "idempotency_operations",
        "moment_influences",
        "moments",
        "demo_sessions",
    ]:
        op.drop_table(table)
