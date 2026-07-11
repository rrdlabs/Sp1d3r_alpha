"""Add is_suspended and suspended_reason to users.

Revision ID: 003
Revises: 002
Create Date: 2026-07-11
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("is_suspended", sa.Boolean, nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("suspended_reason", sa.Text, nullable=True))


def downgrade():
    op.drop_column("users", "suspended_reason")
    op.drop_column("users", "is_suspended")
