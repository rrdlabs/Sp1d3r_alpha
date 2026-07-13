"""Add system search tracking columns to users.

Revision ID: 011
Revises: 010
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("system_searches_used", sa.Integer, nullable=False, server_default=sa.text("0")))
    op.add_column("users", sa.Column("system_search_limit", sa.Integer, nullable=False, server_default=sa.text("100")))
    op.add_column("users", sa.Column("system_searches_period_start", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("users", "system_searches_period_start")
    op.drop_column("users", "system_search_limit")
    op.drop_column("users", "system_searches_used")
