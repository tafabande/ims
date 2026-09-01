"""Add Composite Indexes for Database Audit Optimization

Revision ID: 002_add_composite_indexes
Revises: 001_initial_schema
Create Date: 2026-08-31 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_composite_indexes"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Composite index for Inventory Transaction Double-Entry Ledger Reconciliation
    op.create_index(
        "ix_inventory_tx_product_created",
        "inventory_transactions",
        ["product_id", "id"],
        unique=False,
    )

    # 2. Composite index for Work Session Audit Timelines
    op.create_index(
        "ix_session_events_session_created",
        "session_events",
        ["session_id", "created_at"],
        unique=False,
    )

    # 3. Composite index for Store Stock Lookups
    op.create_index(
        "ix_store_stocks_store_product",
        "store_stocks",
        ["store_id", "product_id"],
        unique=False,
    )

    # 4. Composite index for Operational Case Status & Filtering
    op.create_index(
        "ix_cases_status_created",
        "cases",
        ["status", "created_at"],
        unique=False,
    )

    # 5. Composite index for Sales by Work Session
    op.create_index(
        "ix_sales_work_session",
        "sales",
        ["work_session_id", "created_at"],
        unique=False,
    )

    # 6. Composite index for Notification Recipient queries
    op.create_index(
        "ix_notification_recipients_user_delivered",
        "notification_recipient_records",
        ["user_id", "delivered_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notification_recipients_user_delivered", table_name="notification_recipient_records")
    op.drop_index("ix_sales_work_session", table_name="sales")
    op.drop_index("ix_cases_status_created", table_name="cases")
    op.drop_index("ix_store_stocks_store_product", table_name="store_stocks")
    op.drop_index("ix_session_events_session_created", table_name="session_events")
    op.drop_index("ix_inventory_tx_product_created", table_name="inventory_transactions")
