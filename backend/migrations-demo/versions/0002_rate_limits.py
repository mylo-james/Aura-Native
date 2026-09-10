"""Add opaque fixed-window rate-limit buckets for the isolated Aura demo."""

from alembic import op
import sqlalchemy as sa

revision = "0002_rate_limits"
down_revision = "0001_demo"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "aura_rate_limit_buckets",
        sa.Column("bucket_key", sa.String(length=64), primary_key=True),
        sa.Column("count", sa.BigInteger(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("count >= 0", name="aura_rate_limit_count_nonnegative"),
    )
    op.create_index(
        "ix_aura_rate_limit_buckets_expires_at",
        "aura_rate_limit_buckets",
        ["expires_at"],
    )


def downgrade():
    op.drop_index("ix_aura_rate_limit_buckets_expires_at", table_name="aura_rate_limit_buckets")
    op.drop_table("aura_rate_limit_buckets")
