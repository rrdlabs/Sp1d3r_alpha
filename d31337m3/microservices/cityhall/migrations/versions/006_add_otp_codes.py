"""Create otp_codes table.

Revision ID: 006
Revises: 005
Create Date: 2026-07-11
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "otp_codes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("code", sa.String(6), nullable=False),
        sa.Column("purpose", sa.String(20), nullable=False),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("is_used", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("otp_codes")
