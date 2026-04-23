"""Migrate submission model to daily hours (Mon–Fri) + per-day locations.

Replaces old `submission_rows.hours` and `submission_rows.location` with five
daily hour columns (monday..friday) and adds five `loc_<day>` columns to
`weekly_submissions`. No data migration — historical rows lose old columns.

Revision ID: 0001_daily_hours
Revises:
Create Date: 2026-04-23
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_daily_hours"
down_revision = None
branch_labels = None
depends_on = None


DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday")


def upgrade() -> None:
    # ── submission_rows: drop old hours/location, add 5 daily hour columns ──
    with op.batch_alter_table("submission_rows") as batch:
        # Old columns may not exist in fresh DBs; guard with try/except via raw checks
        for col in ("hours", "location"):
            try:
                batch.drop_column(col)
            except Exception:
                pass
        for d in DAYS:
            batch.add_column(sa.Column(d, sa.Float(), nullable=False, server_default="0"))

    # Drop server defaults after backfill (none needed since no data migration)
    with op.batch_alter_table("submission_rows") as batch:
        for d in DAYS:
            batch.alter_column(d, server_default=None)

    # ── weekly_submissions: add 5 nullable per-day location columns ──
    with op.batch_alter_table("weekly_submissions") as batch:
        for d in DAYS:
            batch.add_column(sa.Column(f"loc_{d}", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("weekly_submissions") as batch:
        for d in DAYS:
            try:
                batch.drop_column(f"loc_{d}")
            except Exception:
                pass

    with op.batch_alter_table("submission_rows") as batch:
        for d in DAYS:
            try:
                batch.drop_column(d)
            except Exception:
                pass
        batch.add_column(sa.Column("hours", sa.Float(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("location", sa.String(), nullable=False, server_default=""))
