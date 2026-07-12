"""Add trial tracking and node_pubkey to users.

Revision ID: 007
Revises: 006
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("trial_searches_used", sa.Integer, nullable=False, server_default=sa.text("0")))
    op.add_column("users", sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("node_pubkey", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("users", "node_pubkey")
    op.drop_column("users", "trial_started_at")
    op.drop_column("users", "trial_searches_used")
