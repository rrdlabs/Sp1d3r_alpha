"""Create node_enroll_tokens table.

Revision ID: 004
Revises: 003
Create Date: 2026-07-11
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "node_enroll_tokens",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("token", sa.String(36), nullable=False, unique=True, index=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("used_by_user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_revoked", sa.Boolean, nullable=False, server_default=sa.text("false")),
    )


def downgrade():
    op.drop_table("node_enroll_tokens")
