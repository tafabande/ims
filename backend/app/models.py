from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_code = Column(String(50), unique=True, index=True, nullable=True)  # e.g. USR-000042
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="STAFF")  # ADMIN, MANAGER, STAFF
    department = Column(String(100), nullable=True)
    active = Column(Boolean, default=True)  # Soft deletion flag
    activation_otp_hash = Column(String(255), nullable=True)
    activation_otp_expires_at = Column(DateTime, nullable=True)
    activation_otp_attempts = Column(Integer, default=0)
    activation_nonce = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("SessionRecord", back_populates="user")
    employee = relationship("Employee", back_populates="user", uselist=False)


class AuditLogRecord(Base):
    __tablename__ = "audit_log_records"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False)
    user_name = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    client_ip = Column(String(50), nullable=False)
    status = Column(String(50), default="SUCCESS")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    department_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. DEP-00001
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job_roles = relationship("JobRole", back_populates="department")
    employees = relationship("Employee", back_populates="department")


class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    role_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. JOB-00012
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="job_roles")
    employees = relationship("Employee", back_populates="job_role")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. EMP-2026-00042
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    position = Column(
        String(100), nullable=True, default="CASHIER"
    )  # STORE_MANAGER, CASHIER, WAREHOUSE_ASSISTANT, STOCK_CONTROLLER, etc.
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id"), nullable=True)
    store_id = Column(
        Integer,
        ForeignKey("stores.id", use_alter=True, name="fk_employee_store_id"),
        nullable=True,
    )
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Optional 0..1 relationship
    status = Column(String(50), default="ACTIVE")  # ACTIVE, INACTIVE, SUSPENDED, TERMINATED
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="employees")
    job_role = relationship("JobRole", back_populates="employees")
    user = relationship("User", back_populates="employee")
    store = relationship("Store", foreign_keys=[store_id])
    manager = relationship("Employee", foreign_keys=[manager_id], remote_side=[id])


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # ADMIN, MANAGER, STAFF
    description = Column(String(255), nullable=True)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)  # e.g. inventory:adjust, products:delete
    description = Column(String(255), nullable=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), nullable=False)
    permission_code = Column(String(100), nullable=False)


class SessionRecord(Base):
    __tablename__ = "session_records"

    id = Column(String(100), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    refresh_token_hash = Column(String(255), nullable=False)
    device_info = Column(String(500), default="Web Browser / POS Terminal")
    ip_address = Column(String(50), default="127.0.0.1")
    is_active = Column(Boolean, default=True, name="active")  # DB column is 'active', Python attr is 'is_active'
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")


class FileRecord(Base):
    __tablename__ = "file_records"

    id = Column(String(100), primary_key=True, index=True)
    original_name = Column(String(255), nullable=False)
    storage_key = Column(String(255), nullable=False)  # UUID filename
    mime_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    uploaded_by = Column(String(255), default="System Operator")
    created_at = Column(DateTime, default=datetime.utcnow)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    category_code = Column(String(50), unique=True, index=True, nullable=True)  # e.g. CAT-000018
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)  # Hierarchical Category Tree

    products = relationship("Product", back_populates="category")
    children = relationship("Category", backref="parent", remote_side=[id])


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)

    products = relationship("Product", back_populates="supplier")
    purchases = relationship("Purchase", back_populates="supplier")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    sales = relationship("Sale", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=True)  # e.g. PRD-000381
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    purchase_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)  # Reserved stock
    reorder_level = Column(Integer, nullable=False, default=5)
    unit = Column(String(20), default="Units")
    barcode = Column(String(100), index=True, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="check_non_negative_stock"),
        CheckConstraint("reserved_quantity >= 0", name="check_non_negative_reserved"),
        CheckConstraint("purchase_price >= 0", name="check_non_negative_buy_price"),
        CheckConstraint("selling_price >= 0", name="check_non_negative_sell_price"),
    )

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    transactions = relationship("InventoryTransaction", back_populates="product")

    @property
    def available_quantity(self) -> int:
        """Available stock = stock_quantity - reserved_quantity"""
        return max(0, self.stock_quantity - self.reserved_quantity)


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    type = Column(String(50), nullable=False)  # RECEIVE, SALE, ADJUSTMENT, DAMAGE, RETURN
    quantity = Column(Integer, nullable=False)  # Delta (+ / -)
    quantity_before = Column(Integer, nullable=False, default=0)  # Snapshot before
    quantity_after = Column(Integer, nullable=False, default=0)  # Snapshot after
    reason_category = Column(String(100), default="CORRECTION")
    reference = Column(String(100), nullable=True)
    user_name = Column(String(255), nullable=True)
    work_session_id = Column(
        Integer,
        ForeignKey("work_sessions.id", use_alter=True, name="fk_tx_work_session"),
        nullable=True,
    )
    work_session_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="transactions")


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. PO-2026-000057
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, RECEIVED, CANCELLED
    total_amount = Column(Float, default=0.0)
    work_session_id = Column(
        Integer,
        ForeignKey("work_sessions.id", use_alter=True, name="fk_po_work_session"),
        nullable=True,
    )
    work_session_code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    received_at = Column(DateTime, nullable=True)

    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. SAL-2026-000184
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    total_amount = Column(Float, nullable=False)
    payment_status = Column(String(50), default="PAID")
    payment_method = Column(String(50), default="Cash")
    work_session_id = Column(
        Integer,
        ForeignKey("work_sessions.id", use_alter=True, name="fk_sale_work_session"),
        nullable=True,
    )
    work_session_code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(255), nullable=True)

    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    store_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. STR-HRE-001
    name = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    manager_id = Column(
        Integer,
        ForeignKey("employees.id", use_alter=True, name="fk_store_manager_id"),
        nullable=True,
    )

    status = Column(String(50), default="ACTIVE")  # ACTIVE, INACTIVE, MAINTENANCE
    operating_hours = Column(String(255), default="08:00 - 18:00")
    created_at = Column(DateTime, default=datetime.utcnow)

    manager = relationship("Employee", foreign_keys=[manager_id])
    warehouses = relationship("Warehouse", back_populates="store")
    registers = relationship("Register", back_populates="store")
    shifts = relationship("Shift", back_populates="store")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. WH-HRE-001
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="warehouses")


class StoreStock(Base):
    __tablename__ = "store_stocks"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)
    reorder_level = Column(Integer, default=5)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store")
    warehouse = relationship("Warehouse")
    product = relationship("Product")


class Register(Base):
    __tablename__ = "registers"

    id = Column(Integer, primary_key=True, index=True)
    register_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. POS-HRE-001
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String(100), nullable=False)
    status = Column(String(50), default="CLOSED")  # OPEN, CLOSED, MAINTENANCE
    current_operator_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    current_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="registers")
    current_operator = relationship("Employee", foreign_keys=[current_operator_id])
    shifts = relationship("Shift", back_populates="register")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. SHIFT-2026-00421
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    register_id = Column(Integer, ForeignKey("registers.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    opening_cash = Column(Float, nullable=False, default=0.0)
    sales_total = Column(Float, default=0.0)
    refunds_total = Column(Float, default=0.0)
    expected_cash = Column(Float, default=0.0)
    actual_cash = Column(Float, nullable=True)
    variance = Column(Float, nullable=True)
    status = Column(String(50), default="OPEN")  # OPEN, CLOSED, RECONCILED
    supervisor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", foreign_keys=[employee_id])
    store = relationship("Store", back_populates="shifts")
    register = relationship("Register", back_populates="shifts")
    supervisor = relationship("Employee", foreign_keys=[supervisor_id])


class PaymentMethodConfig(Base):
    __tablename__ = "payment_method_configs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # CASH, CARD, MOBILE_MONEY, BANK_TRANSFER, CREDIT
    name = Column(String(100), nullable=False)
    fee_percentage = Column(Float, default=0.0)
    enabled = Column(Boolean, default=True)


class ReturnOrder(Base):
    __tablename__ = "return_orders"

    id = Column(Integer, primary_key=True, index=True)
    return_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. RET-2026-00041
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    total_refund_amount = Column(Float, nullable=False, default=0.0)
    reason_category = Column(String(100), default="DEFECTIVE")  # DEFECTIVE, WRONG_ITEM, EXPIRED, CUSTOMER_CHANGE
    is_damaged = Column(Boolean, default=False)
    restock_approved = Column(Boolean, default=True)
    approved_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    status = Column(String(50), default="COMPLETED")  # REQUESTED, APPROVED, REJECTED, COMPLETED
    created_at = Column(DateTime, default=datetime.utcnow)

    sale = relationship("Sale")
    customer = relationship("Customer")
    store = relationship("Store")
    approved_by = relationship("Employee")
    items = relationship("ReturnItem", back_populates="return_order")


class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_order_id = Column(Integer, ForeignKey("return_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    refund_unit_price = Column(Float, nullable=False)
    restockable = Column(Boolean, default=True)

    return_order = relationship("ReturnOrder", back_populates="items")
    product = relationship("Product")


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. TRF-2026-00012
    source_store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    destination_store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    status = Column(
        String(50), default="REQUESTED"
    )  # REQUESTED, APPROVED, DISPATCHED, IN_TRANSIT, RECEIVED, COMPLETED, CANCELLED
    requested_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source_store = relationship("Store", foreign_keys=[source_store_id])
    destination_store = relationship("Store", foreign_keys=[destination_store_id])
    requested_by = relationship("Employee", foreign_keys=[requested_by_emp_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_emp_id])
    items = relationship("StockTransferItem", back_populates="transfer")


class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("stock_transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    transfer = relationship("StockTransfer", back_populates="items")
    product = relationship("Product")


class Stocktake(Base):
    __tablename__ = "stocktakes"

    id = Column(Integer, primary_key=True, index=True)
    stocktake_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. STK-2026-00017
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(String(50), default="IN_PROGRESS")  # DRAFT, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED
    reason = Column(String(100), default="PERIODIC_AUDIT")  # PERIODIC_AUDIT, EXPIRY, DAMAGE, THEFT
    conducted_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store")
    warehouse = relationship("Warehouse")
    conducted_by = relationship("Employee", foreign_keys=[conducted_by_emp_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_emp_id])
    items = relationship("StocktakeItem", back_populates="stocktake")


class StocktakeItem(Base):
    __tablename__ = "stocktake_items"

    id = Column(Integer, primary_key=True, index=True)
    stocktake_id = Column(Integer, ForeignKey("stocktakes.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    system_quantity = Column(Integer, nullable=False)
    physical_count = Column(Integer, nullable=False)
    variance_quantity = Column(Integer, nullable=False)  # physical - system
    notes = Column(Text, nullable=True)

    stocktake = relationship("Stocktake", back_populates="items")
    product = relationship("Product")


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    promo_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. PROMO-2026-014
    name = Column(String(100), nullable=False)
    discount_type = Column(String(50), nullable=False)  # PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y
    value = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, ACTIVE, EXPIRED, DISABLED
    created_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by_emp_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category")
    product = relationship("Product")
    store = relationship("Store")
    created_by = relationship("Employee", foreign_keys=[created_by_emp_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_emp_id])


class LocationBin(Base):
    __tablename__ = "location_bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. BIN-B12
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    zone = Column(String(50), nullable=False, default="ZONE-A")
    aisle = Column(String(50), nullable=False, default="AISLE-01")
    shelf = Column(String(50), nullable=False, default="SHELF-01")
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store")
    warehouse = relationship("Warehouse")


class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    cart_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. CART-2026-00051
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # User or customer ID
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, CONVERTED, EXPIRED, CANCELLED
    expires_at = Column(DateTime, nullable=False)  # 15-minute TTL
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store = relationship("Store")
    user = relationship("User")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")
    reservations = relationship("StockReservation", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")


class StockReservation(Base):
    __tablename__ = "stock_reservations"

    id = Column(Integer, primary_key=True, index=True)
    reservation_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. RES-2026-00017
    cart_id = Column(Integer, ForeignKey("carts.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, CONVERTED, EXPIRED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    cart = relationship("Cart", back_populates="reservations")
    product = relationship("Product")
    store = relationship("Store")
    warehouse = relationship("Warehouse")


class StorePickupOrder(Base):
    __tablename__ = "store_pickup_orders"

    id = Column(Integer, primary_key=True, index=True)
    pickup_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. PICKUP-2026-0017
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    customer_name = Column(String(100), nullable=False)
    status = Column(String(50), default="READY_FOR_COLLECTION")  # READY_FOR_COLLECTION, COLLECTED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)
    collected_at = Column(DateTime, nullable=True)
    collected_by_staff = Column(String(100), nullable=True)

    sale = relationship("Sale")
    store = relationship("Store")


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. APR-2026-00042
    request_type = Column(
        String(50), nullable=False
    )  # STOCK_ADJUSTMENT, REFUND, PRICE_CHANGE, PRODUCT_DELETE, BELOW_MARGIN_SALE
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED, EXECUTED, CANCELLED
    risk_level = Column(String(50), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    entity_name = Column(String(100), nullable=True)  # e.g. Product #482
    entity_id = Column(Integer, nullable=True)
    amount = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    payload_json = Column(Text, nullable=True)  # Serialized JSON payload for execution
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    requester = relationship("User", foreign_keys=[requester_id])
    approver = relationship("User", foreign_keys=[approver_id])


class ReconciliationException(Base):
    __tablename__ = "reconciliation_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    exception_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. EXC-2026-00041
    exception_type = Column(String(50), nullable=False)  # STOCK_VARIANCE, SALES_INVENTORY_ANOMALY, UNMATCHED_RECEIPT
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    expected_stock = Column(Integer, nullable=False)
    actual_stock = Column(Integer, nullable=False)
    variance = Column(Integer, nullable=False)  # Expected - Actual
    severity = Column(String(50), default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="DETECTED")  # DETECTED, OPEN, UNDER_REVIEW, EXPLAINED, RESOLVED
    investigation_notes = Column(Text, nullable=True)
    resolution_type = Column(
        String(50), nullable=True
    )  # REVERSAL_POSTED, DAMAGE_WRITEOFF, CORRECTION_ADJUSTMENT, SHRINKAGE_CONFIRMED
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    store = relationship("Store")
    warehouse = relationship("Warehouse")
    product = relationship("Product")


class PriceRule(Base):
    __tablename__ = "price_rules"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    cost_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    min_allowed_price = Column(Float, nullable=False)  # Hard lower bound floor
    min_margin_pct = Column(Float, default=10.0)  # e.g. 10.0%
    staff_discount_limit_pct = Column(Float, default=2.0)  # Staff can negotiate up to 2%
    manager_discount_limit_pct = Column(Float, default=5.0)  # Manager can negotiate up to 5%
    negotiation_allowance_pct = Column(Float, default=5.0)  # Standard allowance %
    effective_from = Column(DateTime, default=datetime.utcnow)
    effective_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    cost_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    min_allowed_price = Column(Float, nullable=False)
    reason = Column(String(255), nullable=True)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    effective_from = Column(DateTime, default=datetime.utcnow)
    effective_until = Column(DateTime, nullable=True)  # Null if current active price

    product = relationship("Product")
    changed_by = relationship("User")


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, index=True)
    grn_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. GRN-2026-000091
    po_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    received_by_staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(
        String(50), default="PENDING_VERIFICATION"
    )  # DRAFT, RECEIVING, PENDING_VERIFICATION, VERIFIED, PARTIALLY_ACCEPTED, ACCEPTED, REJECTED, CLOSED
    delivery_note_ref = Column(String(100), nullable=True)  # e.g. SUP-DEL-98124
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

    purchase_order = relationship("Purchase")
    supplier = relationship("Supplier")
    store = relationship("Store")
    warehouse = relationship("Warehouse")
    received_by = relationship("User", foreign_keys=[received_by_staff_id])
    verified_by = relationship("User", foreign_keys=[verified_by_manager_id])
    items = relationship("GoodsReceiptItem", back_populates="goods_receipt", cascade="all, delete-orphan")


class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    grn_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    received_quantity = Column(Integer, nullable=False)  # Total physically delivered
    accepted_quantity = Column(Integer, nullable=False)  # Enters inventory (+stock)
    rejected_quantity = Column(Integer, nullable=False, default=0)  # Rejected -> Return
    damaged_quantity = Column(Integer, nullable=False, default=0)  # Damaged -> Write-off/Return
    unit_cost = Column(Float, nullable=False)
    batch_number = Column(String(100), nullable=True)  # Batch / Lot tracking
    expiry_date = Column(DateTime, nullable=True)  # Expiry date
    storage_location = Column(String(100), nullable=True)  # e.g. A-03-04
    rejection_reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    goods_receipt = relationship("GoodsReceipt", back_populates="items")
    product = relationship("Product")


class SupplierReturn(Base):
    __tablename__ = "supplier_returns"

    id = Column(Integer, primary_key=True, index=True)
    return_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. RET-2026-000014
    grn_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(
        String(50), default="DRAFT"
    )  # DRAFT, PENDING_APPROVAL, AUTHORISED, DISPATCHED, RECEIVED_BY_SUPPLIER, CREDIT_PENDING, CLOSED
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    authorized_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    goods_receipt = relationship("GoodsReceipt")
    supplier = relationship("Supplier")
    items = relationship(
        "SupplierReturnItem",
        back_populates="supplier_return",
        cascade="all, delete-orphan",
    )


class SupplierReturnItem(Base):
    __tablename__ = "supplier_return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("supplier_returns.id"), nullable=False)
    grn_item_id = Column(Integer, ForeignKey("goods_receipt_items.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    returned_quantity = Column(Integer, nullable=False)
    return_reason = Column(String(255), nullable=True)

    supplier_return = relationship("SupplierReturn", back_populates="items")
    grn_item = relationship("GoodsReceiptItem")
    product = relationship("Product")


class SupplierInvoice(Base):
    __tablename__ = "supplier_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. INV-SUP-2026-0082
    po_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    billed_quantity = Column(Integer, nullable=False)
    billed_unit_cost = Column(Float, nullable=False)
    total_billed_amount = Column(Float, nullable=False)
    status = Column(
        String(50), default="PENDING_MATCH"
    )  # PENDING_MATCH, MATCHED, PAYMENT_HOLD, APPROVED_FOR_PAYMENT, PAID
    three_way_match_status = Column(
        String(50), default="UNVERIFIED"
    )  # MATCHED, MISMATCH_QTY, MISMATCH_COST, MISMATCH_BOTH
    mismatch_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_order = relationship("Purchase")
    supplier = relationship("Supplier")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)  # e.g. sales.max_staff_discount
    value = Column(String(255), nullable=False)  # e.g. "2.0"
    data_type = Column(String(50), default="float")  # float, int, string, bool, json
    category = Column(String(50), default="sales")  # inventory, sales, pricing, purchases, security
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(
        String(50), unique=True, index=True, nullable=False
    )  # e.g. ECOCASH_MERCHANT, INNBUCKS, ZIPIT_TRANSFER
    name = Column(String(100), nullable=False)  # e.g. "EcoCash Merchant Payment"
    type = Column(String(50), default="MOBILE_MONEY")  # CASH, MOBILE_MONEY, BANK_TRANSFER, CARD
    merchant_number = Column(String(100), nullable=True)  # e.g. 304891 / Till 89210
    merchant_name = Column(String(100), nullable=True)  # e.g. "Harare Main Delta Ltd"
    markup_percentage = Column(Float, default=0.0)  # e.g. 2.5% markup fee
    instructions = Column(Text, nullable=True)  # e.g. "Dial *151*2*2# Enter Merchant Code 304891"
    requires_pop = Column(Boolean, default=True)  # Requires Proof of Payment upload/reference
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class POPVerification(Base):
    __tablename__ = "pop_verifications"

    id = Column(Integer, primary_key=True, index=True)
    pop_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. POP-2026-00042
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    transaction_reference = Column(String(100), nullable=False)  # e.g. MP260825.1840.A90123
    pop_file_key = Column(String(255), nullable=True)  # Storage key of uploaded POP receipt image/PDF
    base_amount = Column(Float, nullable=False)
    markup_amount = Column(Float, default=0.0)
    total_amount_paid = Column(Float, nullable=False)
    status = Column(String(50), default="PENDING_VERIFICATION")  # PENDING_VERIFICATION, VERIFIED, REJECTED
    rejection_reason = Column(Text, nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

    payment_method = relationship("PaymentMethod")
    sale = relationship("Sale")
    verified_by = relationship("User")


class UserDevice(Base):
    __tablename__ = "user_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. DEV-2026-8F31A
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_name = Column(String(150), nullable=False)  # e.g. "Chrome 128 / Windows 11"
    fingerprint_hash = Column(String(64), index=True, nullable=False)  # SHA-256 fingerprint hash
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_trusted = Column(Boolean, default=True)
    is_revoked = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)  # 0.0 (Safe) to 1.0 (High Risk)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. SES-2026-000492
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("user_devices.id"), nullable=True)
    token_hash = Column(String(64), index=True, nullable=False)  # Hashed session JWT/token
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    location_summary = Column(String(100), default="Harare Main Hub")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User")
    device = relationship("UserDevice")


class InventoryAnomaly(Base):
    __tablename__ = "inventory_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    anomaly_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. ANOM-2026-0041
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    opening_stock = Column(Integer, default=0)
    received_qty = Column(Integer, default=0)
    returns_qty = Column(Integer, default=0)
    sales_qty = Column(Integer, default=0)
    damage_qty = Column(Integer, default=0)
    adjustments_qty = Column(Integer, default=0)
    expected_stock = Column(Integer, nullable=False)
    system_stock = Column(Integer, nullable=False)
    variance = Column(Integer, nullable=False)  # expected - actual
    risk_score = Column(Float, default=0.0)  # 0 to 100
    risk_level = Column(String(50), default="MEDIUM")  # NORMAL, MONITOR, REVIEW, HIGH_RISK, CRITICAL
    status = Column(String(50), default="OPEN")  # OPEN, UNDER_INVESTIGATION, RESOLVED, DISMISSED
    reasons_json = Column(Text, nullable=True)  # JSON string of contributing risk factors
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
    warehouse = relationship("Warehouse")


class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. INVEST-2026-0041
    anomaly_id = Column(Integer, ForeignKey("inventory_anomalies.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="HIGH_RISK")
    status = Column(String(50), default="OPEN")  # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    anomaly = relationship("InventoryAnomaly")
    product = relationship("Product")
    warehouse = relationship("Warehouse")
    assigned_user = relationship("User")


class BLEDeviceLocation(Base):
    __tablename__ = "ble_device_locations"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g. BLE-TAG-0091
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    expected_location = Column(String(100), nullable=False)  # e.g. Shelf A3
    detected_location = Column(String(100), nullable=False)  # e.g. Shelf B2
    rssi_dbm = Column(Integer, default=-65)  # Signal strength in dBm
    confidence_percentage = Column(Float, default=82.0)
    has_mismatch = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. IMP-2026-00041
    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), index=True, nullable=False)  # SHA-256
    file_size = Column(Integer, default=0)
    uploader_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    source_type = Column(String(50), default="CSV")  # CSV, EXCEL, API, MANUAL
    entity_type = Column(
        String(50), nullable=False
    )  # PRODUCTS, EMPLOYEES, CUSTOMERS, SUPPLIERS, OPENING_STOCK, PURCHASES, SALES
    record_count = Column(Integer, default=0)
    valid_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)
    status = Column(
        String(50), default="STAGED"
    )  # STAGED, VALIDATED, REQUIRES_CORRECTION, PENDING_APPROVAL, APPROVED, REJECTED, IMPORTED, FAILED
    column_mapping_json = Column(Text, nullable=True)  # Business -> IMS field mapping JSON
    storage_path = Column(String(255), nullable=True)
    approval_id = Column(Integer, ForeignKey("approval_requests.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    uploader = relationship("User", foreign_keys=[uploader_user_id])
    approver = relationship("User", foreign_keys=[approved_by_user_id])
    records = relationship("ImportRecord", back_populates="batch", cascade="all, delete-orphan")


class ImportRecord(Base):
    __tablename__ = "import_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(50), ForeignKey("import_batches.batch_id"), nullable=False)
    row_number = Column(Integer, nullable=False)
    raw_data_json = Column(Text, nullable=False)
    normalized_data_json = Column(Text, nullable=True)
    validation_status = Column(String(50), default="VALID")  # VALID, REJECTED, WARNING
    error_message = Column(Text, nullable=True)
    imported_entity_id = Column(String(100), nullable=True)  # ID or Code of created entity after approval

    batch = relationship("ImportBatch", back_populates="records")


class IntegrationAccount(Base):
    __tablename__ = "integration_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. INT-2026-00012
    name = Column(String(150), nullable=False)  # e.g. Accounting ERP System
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, SUSPENDED, REVOKED
    scopes_json = Column(Text, default="[]")  # e.g. ["products:read", "sales:create"]
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    keys = relationship("IntegrationApiKey", back_populates="account", cascade="all, delete-orphan")
    activity_logs = relationship("IntegrationActivityLog", back_populates="account", cascade="all, delete-orphan")


class IntegrationApiKey(Base):
    __tablename__ = "integration_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(50), ForeignKey("integration_accounts.account_id"), nullable=False)
    api_key_hash = Column(String(128), unique=True, index=True, nullable=False)  # Hashed key
    prefix = Column(String(20), nullable=False)  # e.g. ims_live_a1b2
    name = Column(String(100), nullable=False)  # e.g. Production Secret Key
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    account = relationship("IntegrationAccount", back_populates="keys")


class IntegrationActivityLog(Base):
    __tablename__ = "integration_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(50), ForeignKey("integration_accounts.account_id"), nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    ip_address = Column(String(50), nullable=True)
    request_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("IntegrationAccount", back_populates="activity_logs")


class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    org_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. ORG-000001
    trading_name = Column(String(255), nullable=False)  # e.g. Taa Electronics
    legal_name = Column(String(255), nullable=False)  # e.g. Taa Electronics (Pvt) Ltd
    business_type = Column(
        String(100), nullable=False, default="Retail"
    )  # Retail, Wholesale, Manufacturing, Distribution, Service, Mixed
    industry = Column(
        String(100), nullable=False, default="Electronics"
    )  # Telecommunications, Electronics, Grocery, Automotive, Hardware, etc.
    domain = Column(String(100), nullable=False, default="Electronics & Telecommunications")
    operating_model = Column(
        String(100), default="Warehouse + Retail"
    )  # Single Store, Multi-Store, Warehouse + Retail, Distribution Network
    status = Column(String(50), default="ACTIVE")  # ACTIVE, SUSPENDED
    created_at = Column(DateTime, default=datetime.utcnow)

    classification_history = relationship(
        "OrganisationClassificationHistory",
        back_populates="organisation",
        cascade="all, delete-orphan",
    )


class OrganisationClassificationHistory(Base):
    __tablename__ = "organisation_classification_history"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    classification_type = Column(String(50), nullable=False)  # INDUSTRY, BUSINESS_TYPE, OPERATING_MODEL
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=False)
    reason = Column(Text, nullable=True)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="classification_history")
    changed_by = relationship("User")


# -----------------------------------------------------------------------------
# UNIFIED OPERATIONAL CASE & ESCALATION WORKFLOW ENGINE (SoD Architecture)
# -----------------------------------------------------------------------------


class OperationalCase(Base):
    """
    Unified Operational Case model.
    Represents any staff action requiring managerial review, decision, or escalation:
    REFUND_REQUEST, RECEIVING_DISCREPANCY, FLOAT_VARIANCE, STOCK_ADJUSTMENT,
    SYSTEM_ERROR, PRICE_OVERRIDE, DAMAGE_REPORT, SUPPLIER_DISPUTE.
    """

    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. REF-2026-0042, CAS-2026-0087
    case_type = Column(
        String(50), nullable=False
    )  # REFUND_REQUEST, RECEIVING_DISCREPANCY, FLOAT_VARIANCE, STOCK_ADJUSTMENT, SYSTEM_ERROR, PRICE_OVERRIDE
    status = Column(
        String(50), nullable=False, default="PENDING_REVIEW"
    )  # DRAFT, SUBMITTED, PENDING_REVIEW, APPROVED, DENIED, CONTESTED, RETURNED, EXECUTED, ESCALATED
    priority = Column(String(20), nullable=False, default="NORMAL")  # LOW, NORMAL, HIGH, CRITICAL

    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    created_by = Column(String(100), nullable=False)  # e.g. Tendai M. (EMP-00014)
    assigned_to_role = Column(
        String(50), nullable=False, default="MANAGER"
    )  # MANAGER, STORE_MANAGER, WAREHOUSE_MANAGER
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    entity_type = Column(String(50), nullable=True)  # REFUND, PURCHASE_ORDER, CASH_SESSION, PRODUCT, STOCK_MOVEMENT
    entity_id = Column(String(100), nullable=True)  # e.g. INV-004281, PO-00431, SES-00021
    amount = Column(Float, nullable=True, default=0.0)  # Financial impact if applicable

    evidence_metadata = Column(Text, nullable=True)  # JSON representation of attached receipts, logs, photos
    work_session_id = Column(
        Integer,
        ForeignKey("work_sessions.id", use_alter=True, name="fk_case_work_session"),
        nullable=True,
    )
    work_session_code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan")
    attachments = relationship("CaseAttachment", back_populates="case", cascade="all, delete-orphan")


class CaseEvent(Base):
    """
    Immutable Case Audit Event Trail.
    Logs every state transition and comment. Never overwrites original request.
    """

    __tablename__ = "case_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    event_type = Column(
        String(50), nullable=False
    )  # CREATED, SUBMITTED, REVIEWED, APPROVED, DENIED, CONTESTED, RETURNED, EXECUTED, ESCALATED
    performed_by = Column(String(100), nullable=False)  # Name and role of actor
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    comment = Column(Text, nullable=True)  # Decision rationale or note
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("OperationalCase", back_populates="events")


class CaseAttachment(Base):
    """
    Evidence & Attachments linked to an Operational Case.
    """

    __tablename__ = "case_attachments"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("OperationalCase", back_populates="attachments")


# -----------------------------------------------------------------------------
# THREE-LAYER OPERATIONAL WORK SESSION ARCHITECTURE (Chaa Specification)
# -----------------------------------------------------------------------------


class WorkSession(Base):
    """
    Operational Work Session model.
    Represents the active operational context and job being performed by a user:
    - Layer A: User Authentication Session
    - Layer B: Work Session (Session Type, Location, Terminal, Float, State)
    - Layer C: Operational Transactions & Events

    States: SCHEDULED, OPEN, ACTIVE, PAUSED, CLOSING, CLOSED, SUSPENDED, ABANDONED, FORCED_CLOSED
    """

    __tablename__ = "work_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. WS-2026-0826-0041
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False)  # APP_ADMIN, MANAGER, STAFF, WAREHOUSE, AUDITOR
    location_name = Column(String(100), nullable=False, default="Harare Store #01")
    device_id = Column(String(50), nullable=False, default="POS-01")
    session_type = Column(
        String(50), nullable=False, default="SALES"
    )  # SALES, GOODS_RECEIVING, STOCK_COUNT, STOCK_TRANSFER, DISPATCH, RETURN_PROCESSING, REFUND_PROCESSING, STOCK_ADJUSTMENT, WAREHOUSE_PICKING, WAREHOUSE_PACKING, AUDIT
    status = Column(
        String(50), nullable=False, default="ACTIVE"
    )  # SCHEDULED, OPEN, ACTIVE, PAUSED, CLOSING, CLOSED, SUSPENDED, ABANDONED, FORCED_CLOSED
    opening_float = Column(Float, nullable=False, default=0.0)
    closing_float = Column(Float, nullable=False, default=0.0)
    expected_closing = Column(Float, nullable=False, default=0.0)
    variance = Column(Float, nullable=False, default=0.0)
    total_sales_amount = Column(Float, nullable=False, default=0.0)
    total_refunds_amount = Column(Float, nullable=False, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    paused_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User")
    events = relationship("SessionEvent", back_populates="work_session", cascade="all, delete-orphan")


class SessionEvent(Base):
    """
    Immutable Operational Session Event Trail.
    Logs every action during a work session (e.g. ITEM_SCANNED, SALE_CREATED, REFUND_APPROVED, SESSION_PAUSED).
    """

    __tablename__ = "session_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("work_sessions.id"), nullable=False)
    event_type = Column(
        String(50), nullable=False
    )  # SESSION_STARTED, ITEM_SCANNED, SALE_CREATED, REFUND_REQUESTED, REFUND_APPROVED, STOCK_ADJUSTED, TRANSFER_STARTED, TRANSFER_DISPATCHED, TRANSFER_RECEIVED, EXCEPTION_RAISED, ESCALATION_CREATED, SESSION_PAUSED, SESSION_RESUMED, SESSION_CLOSED
    entity_type = Column(String(50), nullable=True)  # Sale, Refund, Transfer, Product
    entity_id = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    work_session = relationship("WorkSession", back_populates="events")
