"""Add email_verified and email_verification_token to users.

Revision ID: 002
Revises: 001
Create Date: 2026-07-08
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verified", sa.Boolean, default=False, nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("email_verification_token", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("users", "email_verification_token")
    op.drop_column("users", "email_verified")
