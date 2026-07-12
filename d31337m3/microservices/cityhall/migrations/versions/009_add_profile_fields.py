"""Add profile fields for template auto-fill and threat detection.

Revision ID: 009
Revises: 008
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("phone", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("address_line1", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("address_line2", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("zip_code", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("ssn_last4", sa.String(4), nullable=True))


def downgrade():
    op.drop_column("users", "ssn_last4")
    op.drop_column("users", "country")
    op.drop_column("users", "zip_code")
    op.drop_column("users", "state")
    op.drop_column("users", "city")
    op.drop_column("users", "address_line2")
    op.drop_column("users", "address_line1")
    op.drop_column("users", "phone")
