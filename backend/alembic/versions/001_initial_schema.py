"""Initial Schema Setup

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_code", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="STAFF"),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="1"),
        sa.Column("activation_otp_hash", sa.String(length=255), nullable=True),
        sa.Column("activation_otp_expires_at", sa.DateTime(), nullable=True),
        sa.Column("activation_otp_attempts", sa.Integer(), server_default="0"),
        sa.Column("activation_nonce", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_user_code", "users", ["user_code"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. audit_log_records
    op.create_table(
        "audit_log_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.String(length=50), nullable=False),
        sa.Column("user_name", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("client_ip", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="SUCCESS"),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_records_id", "audit_log_records", ["id"], unique=False)
    op.create_index("ix_audit_log_records_event_id", "audit_log_records", ["event_id"], unique=True)

    # 3. departments
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("department_code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_departments_id", "departments", ["id"], unique=False)
    op.create_index("ix_departments_department_code", "departments", ["department_code"], unique=True)

    # 4. job_roles
    op.create_table(
        "job_roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("role_code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_roles_id", "job_roles", ["id"], unique=False)
    op.create_index("ix_job_roles_role_code", "job_roles", ["role_code"], unique=True)

    # 5. roles
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False, unique=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roles_id", "roles", ["id"], unique=False)

    # 6. permissions
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False, unique=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_permissions_id", "permissions", ["id"], unique=False)

    # 7. role_permissions
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("role_name", sa.String(length=50), nullable=False),
        sa.Column("permission_code", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_role_permissions_id", "role_permissions", ["id"], unique=False)

    # 8. session_records
    op.create_table(
        "session_records",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=255), nullable=False),
        sa.Column("device_info", sa.String(length=500), server_default="Web Browser / POS Terminal"),
        sa.Column("ip_address", sa.String(length=50), server_default="127.0.0.1"),
        sa.Column("active", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_session_records_id", "session_records", ["id"], unique=False)

    # 9. file_records
    op.create_table(
        "file_records",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256_hash", sa.String(length=64), nullable=False),
        sa.Column("uploaded_by", sa.String(length=255), server_default="System Operator"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_file_records_id", "file_records", ["id"], unique=False)

    # 10. categories
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_id", "categories", ["id"], unique=False)
    op.create_index("ix_categories_category_code", "categories", ["category_code"], unique=True)
    op.create_index("ix_categories_code", "categories", ["code"], unique=True)

    # 11. suppliers
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("contact_person", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_suppliers_id", "suppliers", ["id"], unique=False)

    # 12. customers
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("contact_person", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customers_id", "customers", ["id"], unique=False)

    # 13. products
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_code", sa.String(length=50), nullable=True),
        sa.Column("sku", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=True),
        sa.Column("purchase_price", sa.Float(), nullable=False),
        sa.Column("selling_price", sa.Float(), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reserved_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reorder_level", sa.Integer(), server_default="5", nullable=False),
        sa.Column("unit", sa.String(length=20), server_default="Units"),
        sa.Column("barcode", sa.String(length=100), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("stock_quantity >= 0", name="check_non_negative_stock"),
        sa.CheckConstraint("reserved_quantity >= 0", name="check_non_negative_reserved"),
        sa.CheckConstraint("purchase_price >= 0", name="check_non_negative_buy_price"),
        sa.CheckConstraint("selling_price >= 0", name="check_non_negative_sell_price"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_id", "products", ["id"], unique=False)
    op.create_index("ix_products_product_code", "products", ["product_code"], unique=True)
    op.create_index("ix_products_sku", "products", ["sku"], unique=True)
    op.create_index("ix_products_barcode", "products", ["barcode"], unique=False)

    # 14. stores
    op.create_table(
        "stores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("manager_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("operating_hours", sa.String(length=255), server_default="08:00 - 18:00"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stores_id", "stores", ["id"], unique=False)
    op.create_index("ix_stores_store_code", "stores", ["store_code"], unique=True)

    # 15. employees
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_code", sa.String(length=50), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("position", sa.String(length=100), server_default="CASHIER"),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("job_role_id", sa.Integer(), sa.ForeignKey("job_roles.id"), nullable=True),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id", use_alter=True, name="fk_employee_store_id"), nullable=True),
        sa.Column("manager_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employees_id", "employees", ["id"], unique=False)
    op.create_index("ix_employees_employee_code", "employees", ["employee_code"], unique=True)
    op.create_index("ix_employees_email", "employees", ["email"], unique=True)

    # Add deferred FK constraint on stores.manager_id -> employees.id
    op.create_foreign_key("fk_store_manager_id", "stores", "employees", ["manager_id"], ["id"], use_alter=True)

    # 16. warehouses
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("warehouse_code", sa.String(length=50), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default="1"),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_warehouses_id", "warehouses", ["id"], unique=False)
    op.create_index("ix_warehouses_warehouse_code", "warehouses", ["warehouse_code"], unique=True)

    # 17. work_sessions
    op.create_table(
        "work_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_code", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("location_name", sa.String(length=100), server_default="Harare Store #01", nullable=False),
        sa.Column("device_id", sa.String(length=50), server_default="POS-01", nullable=False),
        sa.Column("session_type", sa.String(length=50), server_default="SALES", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE", nullable=False),
        sa.Column("opening_float", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("closing_float", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("expected_closing", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("variance", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("total_sales_amount", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("total_refunds_amount", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("paused_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_work_sessions_id", "work_sessions", ["id"], unique=False)
    op.create_index("ix_work_sessions_session_code", "work_sessions", ["session_code"], unique=True)

    # 18. session_events
    op.create_table(
        "session_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("work_sessions.id"), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", sa.String(length=100), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_session_events_id", "session_events", ["id"], unique=False)

    # 19. inventory_transactions
    op.create_table(
        "inventory_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("quantity_before", sa.Integer(), server_default="0", nullable=False),
        sa.Column("quantity_after", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reason_category", sa.String(length=100), server_default="CORRECTION"),
        sa.Column("reference", sa.String(length=100), nullable=True),
        sa.Column("user_name", sa.String(length=255), nullable=True),
        sa.Column("work_session_id", sa.Integer(), sa.ForeignKey("work_sessions.id", use_alter=True, name="fk_tx_work_session"), nullable=True),
        sa.Column("work_session_code", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_transactions_id", "inventory_transactions", ["id"], unique=False)

    # 20. purchases
    op.create_table(
        "purchases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("po_number", sa.String(length=50), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="PENDING"),
        sa.Column("total_amount", sa.Float(), server_default="0.0"),
        sa.Column("work_session_id", sa.Integer(), sa.ForeignKey("work_sessions.id", use_alter=True, name="fk_po_work_session"), nullable=True),
        sa.Column("work_session_code", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_purchases_id", "purchases", ["id"], unique=False)
    op.create_index("ix_purchases_po_number", "purchases", ["po_number"], unique=True)

    # 21. purchase_items
    op.create_table(
        "purchase_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_id", sa.Integer(), sa.ForeignKey("purchases.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_purchase_items_id", "purchase_items", ["id"], unique=False)

    # 22. sales
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_number", sa.String(length=50), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("payment_status", sa.String(length=50), server_default="PAID"),
        sa.Column("payment_method", sa.String(length=50), server_default="Cash"),
        sa.Column("work_session_id", sa.Integer(), sa.ForeignKey("work_sessions.id", use_alter=True, name="fk_sale_work_session"), nullable=True),
        sa.Column("work_session_code", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sales_id", "sales", ["id"], unique=False)
    op.create_index("ix_sales_invoice_number", "sales", ["invoice_number"], unique=True)

    # 23. sale_items
    op.create_table(
        "sale_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sale_items_id", "sale_items", ["id"], unique=False)

    # 24. store_stocks
    op.create_table(
        "store_stocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reserved_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reorder_level", sa.Integer(), server_default="5"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_store_stocks_id", "store_stocks", ["id"], unique=False)

    # 25. registers
    op.create_table(
        "registers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("register_code", sa.String(length=50), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="CLOSED"),
        sa.Column("current_operator_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("current_balance", sa.Float(), server_default="0.0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_registers_id", "registers", ["id"], unique=False)
    op.create_index("ix_registers_register_code", "registers", ["register_code"], unique=True)

    # 26. shifts
    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shift_code", sa.String(length=50), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("register_id", sa.Integer(), sa.ForeignKey("registers.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("opening_cash", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("sales_total", sa.Float(), server_default="0.0"),
        sa.Column("refunds_total", sa.Float(), server_default="0.0"),
        sa.Column("expected_cash", sa.Float(), server_default="0.0"),
        sa.Column("actual_cash", sa.Float(), nullable=True),
        sa.Column("variance", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="OPEN"),
        sa.Column("supervisor_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shifts_id", "shifts", ["id"], unique=False)
    op.create_index("ix_shifts_shift_code", "shifts", ["shift_code"], unique=True)

    # 27. payment_method_configs
    op.create_table(
        "payment_method_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False, unique=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("fee_percentage", sa.Float(), server_default="0.0"),
        sa.Column("enabled", sa.Boolean(), server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payment_method_configs_id", "payment_method_configs", ["id"], unique=False)

    # 28. return_orders
    op.create_table(
        "return_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("return_code", sa.String(length=50), nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("total_refund_amount", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("reason_category", sa.String(length=100), server_default="DEFECTIVE"),
        sa.Column("is_damaged", sa.Boolean(), server_default="0"),
        sa.Column("restock_approved", sa.Boolean(), server_default="1"),
        sa.Column("approved_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="COMPLETED"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_return_orders_id", "return_orders", ["id"], unique=False)
    op.create_index("ix_return_orders_return_code", "return_orders", ["return_code"], unique=True)

    # 29. return_items
    op.create_table(
        "return_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("return_order_id", sa.Integer(), sa.ForeignKey("return_orders.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("refund_unit_price", sa.Float(), nullable=False),
        sa.Column("restockable", sa.Boolean(), server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_return_items_id", "return_items", ["id"], unique=False)

    # 30. stock_transfers
    op.create_table(
        "stock_transfers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("transfer_code", sa.String(length=50), nullable=False),
        sa.Column("source_store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("destination_store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="REQUESTED"),
        sa.Column("requested_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("approved_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_transfers_id", "stock_transfers", ["id"], unique=False)
    op.create_index("ix_stock_transfers_transfer_code", "stock_transfers", ["transfer_code"], unique=True)

    # 31. stock_transfer_items
    op.create_table(
        "stock_transfer_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("transfer_id", sa.Integer(), sa.ForeignKey("stock_transfers.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_transfer_items_id", "stock_transfer_items", ["id"], unique=False)

    # 32. stocktakes
    op.create_table(
        "stocktakes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stocktake_code", sa.String(length=50), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="IN_PROGRESS"),
        sa.Column("reason", sa.String(length=100), server_default="PERIODIC_AUDIT"),
        sa.Column("conducted_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("approved_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stocktakes_id", "stocktakes", ["id"], unique=False)
    op.create_index("ix_stocktakes_stocktake_code", "stocktakes", ["stocktake_code"], unique=True)

    # 33. stocktake_items
    op.create_table(
        "stocktake_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stocktake_id", sa.Integer(), sa.ForeignKey("stocktakes.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("system_quantity", sa.Integer(), nullable=False),
        sa.Column("physical_count", sa.Integer(), nullable=False),
        sa.Column("variance_quantity", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stocktake_items_id", "stocktake_items", ["id"], unique=False)

    # 34. promotions
    op.create_table(
        "promotions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("promo_code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("discount_type", sa.String(length=50), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="PENDING"),
        sa.Column("created_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("approved_by_emp_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_promotions_id", "promotions", ["id"], unique=False)
    op.create_index("ix_promotions_promo_code", "promotions", ["promo_code"], unique=True)

    # 35. location_bins
    op.create_table(
        "location_bins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("bin_code", sa.String(length=50), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("zone", sa.String(length=50), server_default="ZONE-A", nullable=False),
        sa.Column("aisle", sa.String(length=50), server_default="AISLE-01", nullable=False),
        sa.Column("shelf", sa.String(length=50), server_default="SHELF-01", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_location_bins_id", "location_bins", ["id"], unique=False)
    op.create_index("ix_location_bins_bin_code", "location_bins", ["bin_code"], unique=True)

    # 36. carts
    op.create_table(
        "carts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cart_code", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_carts_id", "carts", ["id"], unique=False)
    op.create_index("ix_carts_cart_code", "carts", ["cart_code"], unique=True)

    # 37. cart_items
    op.create_table(
        "cart_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cart_id", sa.Integer(), sa.ForeignKey("carts.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cart_items_id", "cart_items", ["id"], unique=False)

    # 38. stock_reservations
    op.create_table(
        "stock_reservations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reservation_code", sa.String(length=50), nullable=False),
        sa.Column("cart_id", sa.Integer(), sa.ForeignKey("carts.id"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_reservations_id", "stock_reservations", ["id"], unique=False)
    op.create_index("ix_stock_reservations_reservation_code", "stock_reservations", ["reservation_code"], unique=True)

    # 39. store_pickup_orders
    op.create_table(
        "store_pickup_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pickup_code", sa.String(length=50), nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("customer_name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="READY_FOR_COLLECTION"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("collected_at", sa.DateTime(), nullable=True),
        sa.Column("collected_by_staff", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_store_pickup_orders_id", "store_pickup_orders", ["id"], unique=False)
    op.create_index("ix_store_pickup_orders_pickup_code", "store_pickup_orders", ["pickup_code"], unique=True)

    # 40. approval_requests
    op.create_table(
        "approval_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_code", sa.String(length=50), nullable=False),
        sa.Column("request_type", sa.String(length=50), nullable=False),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="PENDING"),
        sa.Column("risk_level", sa.String(length=50), server_default="MEDIUM"),
        sa.Column("entity_name", sa.String(length=100), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_approval_requests_id", "approval_requests", ["id"], unique=False)
    op.create_index("ix_approval_requests_request_code", "approval_requests", ["request_code"], unique=True)

    # 41. reconciliation_exceptions
    op.create_table(
        "reconciliation_exceptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exception_code", sa.String(length=50), nullable=False),
        sa.Column("exception_type", sa.String(length=50), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("expected_stock", sa.Integer(), nullable=False),
        sa.Column("actual_stock", sa.Integer(), nullable=False),
        sa.Column("variance", sa.Integer(), nullable=False),
        sa.Column("severity", sa.String(length=50), server_default="HIGH"),
        sa.Column("status", sa.String(length=50), server_default="DETECTED"),
        sa.Column("investigation_notes", sa.Text(), nullable=True),
        sa.Column("resolution_type", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reconciliation_exceptions_id", "reconciliation_exceptions", ["id"], unique=False)
    op.create_index("ix_reconciliation_exceptions_exception_code", "reconciliation_exceptions", ["exception_code"], unique=True)

    # 42. price_rules
    op.create_table(
        "price_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False, unique=True),
        sa.Column("cost_price", sa.Float(), nullable=False),
        sa.Column("selling_price", sa.Float(), nullable=False),
        sa.Column("min_allowed_price", sa.Float(), nullable=False),
        sa.Column("min_margin_pct", sa.Float(), server_default="10.0"),
        sa.Column("staff_discount_limit_pct", sa.Float(), server_default="2.0"),
        sa.Column("manager_discount_limit_pct", sa.Float(), server_default="5.0"),
        sa.Column("negotiation_allowance_pct", sa.Float(), server_default="5.0"),
        sa.Column("effective_from", sa.DateTime(), nullable=True),
        sa.Column("effective_until", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_rules_id", "price_rules", ["id"], unique=False)

    # 43. price_history
    op.create_table(
        "price_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("cost_price", sa.Float(), nullable=False),
        sa.Column("selling_price", sa.Float(), nullable=False),
        sa.Column("min_allowed_price", sa.Float(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("effective_from", sa.DateTime(), nullable=True),
        sa.Column("effective_until", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_history_id", "price_history", ["id"], unique=False)

    # 44. goods_receipts
    op.create_table(
        "goods_receipts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("grn_code", sa.String(length=50), nullable=False),
        sa.Column("po_id", sa.Integer(), sa.ForeignKey("purchases.id"), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("received_by_staff_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("verified_by_manager_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="PENDING_VERIFICATION"),
        sa.Column("delivery_note_ref", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goods_receipts_id", "goods_receipts", ["id"], unique=False)
    op.create_index("ix_goods_receipts_grn_code", "goods_receipts", ["grn_code"], unique=True)

    # 45. goods_receipt_items
    op.create_table(
        "goods_receipt_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("grn_id", sa.Integer(), sa.ForeignKey("goods_receipts.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("received_quantity", sa.Integer(), nullable=False),
        sa.Column("accepted_quantity", sa.Integer(), nullable=False),
        sa.Column("rejected_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("damaged_quantity", sa.Integer(), server_default="0", nullable=False),
        sa.Column("unit_cost", sa.Float(), nullable=False),
        sa.Column("batch_number", sa.String(length=100), nullable=True),
        sa.Column("expiry_date", sa.DateTime(), nullable=True),
        sa.Column("storage_location", sa.String(length=100), nullable=True),
        sa.Column("rejection_reason", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goods_receipt_items_id", "goods_receipt_items", ["id"], unique=False)

    # 46. supplier_returns
    op.create_table(
        "supplier_returns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("return_code", sa.String(length=50), nullable=False),
        sa.Column("grn_id", sa.Integer(), sa.ForeignKey("goods_receipts.id"), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="DRAFT"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("authorized_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_supplier_returns_id", "supplier_returns", ["id"], unique=False)
    op.create_index("ix_supplier_returns_return_code", "supplier_returns", ["return_code"], unique=True)

    # 47. supplier_return_items
    op.create_table(
        "supplier_return_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("return_id", sa.Integer(), sa.ForeignKey("supplier_returns.id"), nullable=False),
        sa.Column("grn_item_id", sa.Integer(), sa.ForeignKey("goods_receipt_items.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("returned_quantity", sa.Integer(), nullable=False),
        sa.Column("return_reason", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_supplier_return_items_id", "supplier_return_items", ["id"], unique=False)

    # 48. supplier_invoices
    op.create_table(
        "supplier_invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_code", sa.String(length=50), nullable=False),
        sa.Column("po_id", sa.Integer(), sa.ForeignKey("purchases.id"), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("billed_quantity", sa.Integer(), nullable=False),
        sa.Column("billed_unit_cost", sa.Float(), nullable=False),
        sa.Column("total_billed_amount", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="PENDING_MATCH"),
        sa.Column("three_way_match_status", sa.String(length=50), server_default="UNVERIFIED"),
        sa.Column("mismatch_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_supplier_invoices_id", "supplier_invoices", ["id"], unique=False)
    op.create_index("ix_supplier_invoices_invoice_code", "supplier_invoices", ["invoice_code"], unique=True)

    # 49. system_settings
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("data_type", sa.String(length=50), server_default="float"),
        sa.Column("category", sa.String(length=50), server_default="sales"),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_system_settings_id", "system_settings", ["id"], unique=False)
    op.create_index("ix_system_settings_key", "system_settings", ["key"], unique=True)

    # 50. payment_methods
    op.create_table(
        "payment_methods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=50), server_default="MOBILE_MONEY"),
        sa.Column("merchant_number", sa.String(length=100), nullable=True),
        sa.Column("merchant_name", sa.String(length=100), nullable=True),
        sa.Column("markup_percentage", sa.Float(), server_default="0.0"),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("requires_pop", sa.Boolean(), server_default="1"),
        sa.Column("is_active", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payment_methods_id", "payment_methods", ["id"], unique=False)
    op.create_index("ix_payment_methods_code", "payment_methods", ["code"], unique=True)

    # 51. pop_verifications
    op.create_table(
        "pop_verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pop_code", sa.String(length=50), nullable=False),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=True),
        sa.Column("payment_method_id", sa.Integer(), sa.ForeignKey("payment_methods.id"), nullable=False),
        sa.Column("transaction_reference", sa.String(length=100), nullable=False),
        sa.Column("pop_file_key", sa.String(length=255), nullable=True),
        sa.Column("base_amount", sa.Float(), nullable=False),
        sa.Column("markup_amount", sa.Float(), server_default="0.0"),
        sa.Column("total_amount_paid", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="PENDING_VERIFICATION"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("verified_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pop_verifications_id", "pop_verifications", ["id"], unique=False)
    op.create_index("ix_pop_verifications_pop_code", "pop_verifications", ["pop_code"], unique=True)

    # 52. user_devices
    op.create_table(
        "user_devices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("device_name", sa.String(length=150), nullable=False),
        sa.Column("fingerprint_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("first_seen", sa.DateTime(), nullable=True),
        sa.Column("last_seen", sa.DateTime(), nullable=True),
        sa.Column("is_trusted", sa.Boolean(), server_default="1"),
        sa.Column("is_revoked", sa.Boolean(), server_default="0"),
        sa.Column("risk_score", sa.Float(), server_default="0.0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_devices_id", "user_devices", ["id"], unique=False)
    op.create_index("ix_user_devices_device_id", "user_devices", ["device_id"], unique=True)
    op.create_index("ix_user_devices_fingerprint_hash", "user_devices", ["fingerprint_hash"], unique=False)

    # 53. user_sessions
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=50), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("user_devices.id"), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_address", sa.String(length=50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("location_summary", sa.String(length=100), server_default="Harare Main Hub"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_seen", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), server_default="0"),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_sessions_id", "user_sessions", ["id"], unique=False)
    op.create_index("ix_user_sessions_session_id", "user_sessions", ["session_id"], unique=True)
    op.create_index("ix_user_sessions_token_hash", "user_sessions", ["token_hash"], unique=False)

    # 54. inventory_anomalies
    op.create_table(
        "inventory_anomalies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("anomaly_code", sa.String(length=50), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("opening_stock", sa.Integer(), server_default="0"),
        sa.Column("received_qty", sa.Integer(), server_default="0"),
        sa.Column("returns_qty", sa.Integer(), server_default="0"),
        sa.Column("sales_qty", sa.Integer(), server_default="0"),
        sa.Column("damage_qty", sa.Integer(), server_default="0"),
        sa.Column("adjustments_qty", sa.Integer(), server_default="0"),
        sa.Column("expected_stock", sa.Integer(), nullable=False),
        sa.Column("system_stock", sa.Integer(), nullable=False),
        sa.Column("variance", sa.Integer(), nullable=False),
        sa.Column("risk_score", sa.Float(), server_default="0.0"),
        sa.Column("risk_level", sa.String(length=50), server_default="MEDIUM"),
        sa.Column("status", sa.String(length=50), server_default="OPEN"),
        sa.Column("reasons_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_anomalies_id", "inventory_anomalies", ["id"], unique=False)
    op.create_index("ix_inventory_anomalies_anomaly_code", "inventory_anomalies", ["anomaly_code"], unique=True)

    # 55. investigation_cases
    op.create_table(
        "investigation_cases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("case_code", sa.String(length=50), nullable=False),
        sa.Column("anomaly_id", sa.Integer(), sa.ForeignKey("inventory_anomalies.id"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=True),
        sa.Column("risk_score", sa.Float(), server_default="0.0"),
        sa.Column("risk_level", sa.String(length=50), server_default="HIGH_RISK"),
        sa.Column("status", sa.String(length=50), server_default="OPEN"),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_investigation_cases_id", "investigation_cases", ["id"], unique=False)
    op.create_index("ix_investigation_cases_case_code", "investigation_cases", ["case_code"], unique=True)

    # 56. ble_device_locations
    op.create_table(
        "ble_device_locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.String(length=100), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("expected_location", sa.String(length=100), nullable=False),
        sa.Column("detected_location", sa.String(length=100), nullable=False),
        sa.Column("rssi_dbm", sa.Integer(), server_default="-65"),
        sa.Column("confidence_percentage", sa.Float(), server_default="82.0"),
        sa.Column("has_mismatch", sa.Boolean(), server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ble_device_locations_id", "ble_device_locations", ["id"], unique=False)
    op.create_index("ix_ble_device_locations_tag_id", "ble_device_locations", ["tag_id"], unique=True)

    # 57. import_batches
    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.String(length=50), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False),
        sa.Column("file_size", sa.Integer(), server_default="0"),
        sa.Column("uploader_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("source_type", sa.String(length=50), server_default="CSV"),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("record_count", sa.Integer(), server_default="0"),
        sa.Column("valid_count", sa.Integer(), server_default="0"),
        sa.Column("rejected_count", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(length=50), server_default="STAGED"),
        sa.Column("column_mapping_json", sa.Text(), nullable=True),
        sa.Column("storage_path", sa.String(length=255), nullable=True),
        sa.Column("approval_id", sa.Integer(), sa.ForeignKey("approval_requests.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("approved_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_import_batches_id", "import_batches", ["id"], unique=False)
    op.create_index("ix_import_batches_batch_id", "import_batches", ["batch_id"], unique=True)
    op.create_index("ix_import_batches_file_hash", "import_batches", ["file_hash"], unique=False)

    # 58. import_records
    op.create_table(
        "import_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.String(length=50), sa.ForeignKey("import_batches.batch_id"), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("raw_data_json", sa.Text(), nullable=False),
        sa.Column("normalized_data_json", sa.Text(), nullable=True),
        sa.Column("validation_status", sa.String(length=50), server_default="VALID"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("imported_entity_id", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_import_records_id", "import_records", ["id"], unique=False)

    # 59. integration_accounts
    op.create_table(
        "integration_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("scopes_json", sa.Text(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_accounts_id", "integration_accounts", ["id"], unique=False)
    op.create_index("ix_integration_accounts_account_id", "integration_accounts", ["account_id"], unique=True)

    # 60. integration_api_keys
    op.create_table(
        "integration_api_keys",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.String(length=50), sa.ForeignKey("integration_accounts.account_id"), nullable=False),
        sa.Column("api_key_hash", sa.String(length=128), nullable=False),
        sa.Column("prefix", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_api_keys_id", "integration_api_keys", ["id"], unique=False)
    op.create_index("ix_integration_api_keys_api_key_hash", "integration_api_keys", ["api_key_hash"], unique=True)

    # 61. integration_activity_logs
    op.create_table(
        "integration_activity_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.String(length=50), sa.ForeignKey("integration_accounts.account_id"), nullable=False),
        sa.Column("endpoint", sa.String(length=255), nullable=False),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(length=50), nullable=True),
        sa.Column("request_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_activity_logs_id", "integration_activity_logs", ["id"], unique=False)

    # 62. organisations
    op.create_table(
        "organisations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_code", sa.String(length=50), nullable=False),
        sa.Column("trading_name", sa.String(length=255), nullable=False),
        sa.Column("legal_name", sa.String(length=255), nullable=False),
        sa.Column("business_type", sa.String(length=100), server_default="Retail", nullable=False),
        sa.Column("industry", sa.String(length=100), server_default="Electronics", nullable=False),
        sa.Column("domain", sa.String(length=100), server_default="Electronics & Telecommunications", nullable=False),
        sa.Column("operating_model", sa.String(length=100), server_default="Warehouse + Retail"),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organisations_id", "organisations", ["id"], unique=False)
    op.create_index("ix_organisations_org_code", "organisations", ["org_code"], unique=True)

    # 63. organisation_classification_history
    op.create_table(
        "organisation_classification_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id"), nullable=False),
        sa.Column("classification_type", sa.String(length=50), nullable=False),
        sa.Column("old_value", sa.String(length=255), nullable=True),
        sa.Column("new_value", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("changed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organisation_classification_history_id", "organisation_classification_history", ["id"], unique=False)

    # 64. cases
    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("case_number", sa.String(length=50), nullable=False),
        sa.Column("case_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="PENDING_REVIEW", nullable=False),
        sa.Column("priority", sa.String(length=20), server_default="NORMAL", nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("assigned_to_role", sa.String(length=50), server_default="MANAGER", nullable=False),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", sa.String(length=100), nullable=True),
        sa.Column("amount", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("evidence_metadata", sa.Text(), nullable=True),
        sa.Column("work_session_id", sa.Integer(), sa.ForeignKey("work_sessions.id", use_alter=True, name="fk_case_work_session"), nullable=True),
        sa.Column("work_session_code", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cases_id", "cases", ["id"], unique=False)
    op.create_index("ix_cases_case_number", "cases", ["case_number"], unique=True)

    # 65. case_events
    op.create_table(
        "case_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("performed_by", sa.String(length=100), nullable=False),
        sa.Column("old_status", sa.String(length=50), nullable=True),
        sa.Column("new_status", sa.String(length=50), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_case_events_id", "case_events", ["id"], unique=False)

    # 66. case_attachments
    op.create_table(
        "case_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("uploaded_by", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_case_attachments_id", "case_attachments", ["id"], unique=False)

    # 67. notification_records
    op.create_table(
        "notification_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("notification_code", sa.String(length=50), nullable=False),
        sa.Column("type", sa.String(length=50), server_default="ONE_TO_ONE", nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=True),
        sa.Column("target_value", sa.String(length=100), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=50), server_default="INFO", nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=True),
        sa.Column("resource_id", sa.String(length=100), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_records_id", "notification_records", ["id"], unique=False)
    op.create_index("ix_notification_records_notification_code", "notification_records", ["notification_code"], unique=True)

    # 68. notification_recipient_records
    op.create_table(
        "notification_recipient_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("notification_id", sa.Integer(), sa.ForeignKey("notification_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_recipient_records_id", "notification_recipient_records", ["id"], unique=False)
    op.create_index("ix_notification_recipient_records_user_id", "notification_recipient_records", ["user_id"], unique=False)


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table("notification_recipient_records")
    op.drop_table("notification_records")
    op.drop_table("case_attachments")
    op.drop_table("case_events")
    op.drop_table("cases")
    op.drop_table("organisation_classification_history")
    op.drop_table("organisations")
    op.drop_table("integration_activity_logs")
    op.drop_table("integration_api_keys")
    op.drop_table("integration_accounts")
    op.drop_table("import_records")
    op.drop_table("import_batches")
    op.drop_table("ble_device_locations")
    op.drop_table("investigation_cases")
    op.drop_table("inventory_anomalies")
    op.drop_table("user_sessions")
    op.drop_table("user_devices")
    op.drop_table("pop_verifications")
    op.drop_table("payment_methods")
    op.drop_table("system_settings")
    op.drop_table("supplier_invoices")
    op.drop_table("supplier_return_items")
    op.drop_table("supplier_returns")
    op.drop_table("goods_receipt_items")
    op.drop_table("goods_receipts")
    op.drop_table("price_history")
    op.drop_table("price_rules")
    op.drop_table("reconciliation_exceptions")
    op.drop_table("approval_requests")
    op.drop_table("store_pickup_orders")
    op.drop_table("stock_reservations")
    op.drop_table("cart_items")
    op.drop_table("carts")
    op.drop_table("location_bins")
    op.drop_table("promotions")
    op.drop_table("stocktake_items")
    op.drop_table("stocktakes")
    op.drop_table("stock_transfer_items")
    op.drop_table("stock_transfers")
    op.drop_table("return_items")
    op.drop_table("return_orders")
    op.drop_table("shifts")
    op.drop_table("registers")
    op.drop_table("store_stocks")
    op.drop_table("sale_items")
    op.drop_table("sales")
    op.drop_table("purchase_items")
    op.drop_table("purchases")
    op.drop_table("inventory_transactions")
    op.drop_table("session_events")
    op.drop_table("work_sessions")
    op.drop_table("warehouses")
    op.drop_table("employees")
    op.drop_table("stores")
    op.drop_table("products")
    op.drop_table("customers")
    op.drop_table("suppliers")
    op.drop_table("categories")
    op.drop_table("file_records")
    op.drop_table("session_records")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("job_roles")
    op.drop_table("departments")
    op.drop_table("audit_log_records")
    op.drop_table("users")
