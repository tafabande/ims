from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# IAM & Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes in seconds
    user_id: str
    user_code: str | None = None
    full_name: str | None = None
    email: str | None = None
    role: str
    permissions: list[str]
    session_id: str | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class SystemStatusResponse(BaseModel):
    is_initialized: bool
    user_count: int
    product_count: int
    store_count: int
    has_enterprise_data: bool
    system_name: str = "Enterprise IMS"
    version: str = "1.0.0"


class InitializeRootAdminRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


# User Management Schemas
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "STAFF"  # ADMIN, MANAGER, STAFF
    department: str | None = "Warehouse"


class UserResponse(BaseModel):
    id: int
    user_code: str | None = None
    email: str
    full_name: str
    role: str
    department: str | None
    active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Organization & Employee Schemas
class DepartmentCreate(BaseModel):
    department_code: str
    name: str
    description: str | None = None


class DepartmentResponse(DepartmentCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class JobRoleCreate(BaseModel):
    role_code: str
    name: str
    department_id: int
    description: str | None = None


class JobRoleResponse(JobRoleCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    position: str | None = "CASHIER"
    department_id: int | None = None
    job_role_id: int | None = None
    store_id: int | None = None
    manager_id: int | None = None
    user_id: int | None = None  # Optional link to login User Account
    status: str = "ACTIVE"  # ACTIVE, INACTIVE, SUSPENDED, TERMINATED


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    position: str | None = None
    department_id: int | None = None
    job_role_id: int | None = None
    store_id: int | None = None
    manager_id: int | None = None
    user_id: int | None = None
    status: str | None = None


class EmployeeResponse(EmployeeCreate):
    id: int
    employee_code: str
    store_name: str | None = None
    manager_name: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmployeeActivityResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    position: str | None = None
    store_id: int | None = None
    status: str
    total_sales_count: int = 0
    total_sales_amount: float = 0.0
    total_returns_count: int = 0
    total_adjustments_count: int = 0
    last_activity_timestamp: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# Category Schemas
class CategoryBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    parent_id: int | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    category_code: str | None = None
    model_config = ConfigDict(from_attributes=True)


class CategoryTreeResponse(CategoryResponse):
    children: list["CategoryTreeResponse"] = []
    model_config = ConfigDict(from_attributes=True)


# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Customer Schemas
class CustomerBase(BaseModel):
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Product Schemas
class ProductBase(BaseModel):
    sku: str
    name: str
    description: str | None = None
    category_id: int
    supplier_id: int | None = None
    purchase_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    stock_quantity: int = Field(ge=0, default=0)
    reserved_quantity: int = Field(ge=0, default=0)
    reorder_level: int = Field(ge=0, default=5)
    unit: str = "Units"
    barcode: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    description: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None
    purchase_price: float | None = None
    selling_price: float | None = None
    stock_quantity: int | None = None
    reserved_quantity: int | None = None
    reorder_level: int | None = None
    unit: str | None = None
    barcode: str | None = None


class ProductResponse(ProductBase):
    id: int
    product_code: str | None = None
    active: bool
    available_quantity: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Inventory Transaction Schemas
class InventoryAdjustmentRequest(BaseModel):
    product_id: int
    quantity: int  # positive for increase, negative for decrease
    type: str = "ADJUSTMENT"
    reason_category: str | None = "CORRECTION"
    reference: str | None = None
    notes: str | None = None
    user_name: str | None = "System Operator"


class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    po_number: str | None = None
    notes: str | None = None


class StockDamageRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    notes: str = Field(min_length=3)


class StockReturnRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    customer_id: int | None = None
    notes: str | None = None


class InventoryTransactionResponse(BaseModel):
    id: int
    product_id: int
    type: str
    quantity: int
    quantity_before: int
    quantity_after: int
    reason_category: str | None
    reference: str | None
    user_name: str | None
    notes: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Purchase Order Schemas
class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class PurchaseCreate(BaseModel):
    supplier_id: int
    items: list[PurchaseItemCreate]


class PurchaseResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    status: str
    total_amount: float
    created_at: datetime
    received_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


# Sale Schemas
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    customer_id: int
    payment_method: str = "Credit Card"
    items: list[SaleItemCreate]


class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    total_amount: float
    payment_status: str
    payment_method: str
    created_at: datetime
    created_by: str | None
    model_config = ConfigDict(from_attributes=True)


# Store & Warehouse Schemas
class StoreCreate(BaseModel):
    store_code: str
    name: str
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    manager_id: int | None = None
    status: str = "ACTIVE"
    operating_hours: str | None = "08:00 - 18:00"


class StoreResponse(StoreCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WarehouseCreate(BaseModel):
    warehouse_code: str
    store_id: int
    name: str
    is_default: bool = True
    status: str = "ACTIVE"


class WarehouseResponse(WarehouseCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Cash Register & Shift Schemas
class RegisterCreate(BaseModel):
    register_code: str
    store_id: int
    name: str
    status: str = "CLOSED"


class RegisterResponse(RegisterCreate):
    id: int
    current_operator_id: int | None = None
    current_balance: float = 0.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ShiftOpenRequest(BaseModel):
    employee_id: int
    store_id: int
    register_id: int
    opening_cash: float = Field(ge=0)


class ShiftCloseRequest(BaseModel):
    actual_cash: float = Field(ge=0)
    supervisor_id: int | None = None


class ShiftResponse(BaseModel):
    id: int
    shift_code: str
    employee_id: int
    store_id: int
    register_id: int
    start_time: datetime
    end_time: datetime | None = None
    opening_cash: float
    sales_total: float
    refunds_total: float
    expected_cash: float
    actual_cash: float | None = None
    variance: float | None = None
    status: str
    supervisor_id: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Returns & Refunds Schemas
class ReturnItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    refund_unit_price: float = Field(ge=0)
    restockable: bool = True


class ReturnOrderCreate(BaseModel):
    sale_id: int
    reason_category: str = "DEFECTIVE"  # DEFECTIVE, WRONG_ITEM, EXPIRED, CUSTOMER_CHANGE
    is_damaged: bool = False
    restock_approved: bool = True
    approved_by_emp_id: int | None = None
    items: list[ReturnItemCreate]


class ReturnItemResponse(ReturnItemCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ReturnOrderResponse(BaseModel):
    id: int
    return_code: str
    sale_id: int
    customer_id: int | None = None
    store_id: int | None = None
    total_refund_amount: float
    reason_category: str
    is_damaged: bool
    restock_approved: bool
    status: str
    created_at: datetime
    items: list[ReturnItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# Stock Transfers Schemas
class StockTransferItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class StockTransferCreate(BaseModel):
    source_store_id: int
    destination_store_id: int
    requested_by_emp_id: int | None = None
    notes: str | None = None
    items: list[StockTransferItemCreate]


class StockTransferItemResponse(StockTransferItemCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class StockTransferResponse(BaseModel):
    id: int
    transfer_code: str
    source_store_id: int
    destination_store_id: int
    status: str
    requested_by_emp_id: int | None = None
    approved_by_emp_id: int | None = None
    notes: str | None = None
    created_at: datetime
    items: list[StockTransferItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# Stocktake Schemas
class StocktakeItemCreate(BaseModel):
    product_id: int
    system_quantity: int
    physical_count: int
    notes: str | None = None


class StocktakeCreate(BaseModel):
    store_id: int
    warehouse_id: int | None = None
    reason: str = "PERIODIC_AUDIT"
    conducted_by_emp_id: int | None = None
    items: list[StocktakeItemCreate]


class StocktakeItemResponse(StocktakeItemCreate):
    id: int
    variance_quantity: int
    model_config = ConfigDict(from_attributes=True)


class StocktakeResponse(BaseModel):
    id: int
    stocktake_code: str
    store_id: int
    warehouse_id: int | None = None
    status: str
    reason: str
    conducted_by_emp_id: int | None = None
    approved_by_emp_id: int | None = None
    created_at: datetime
    items: list[StocktakeItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# Promotions Schemas
class PromotionCreate(BaseModel):
    promo_code: str
    name: str
    discount_type: str  # PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y
    value: float = Field(gt=0)
    category_id: int | None = None
    product_id: int | None = None
    store_id: int | None = None
    start_date: datetime
    end_date: datetime


class PromotionResponse(PromotionCreate):
    id: int
    status: str
    created_by_emp_id: int | None = None
    approved_by_emp_id: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Cart & Stock Reservation Schemas
class CartItemReserve(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class CartReserveRequest(BaseModel):
    store_id: int
    user_id: int | None = None
    items: list[CartItemReserve]
    ttl_minutes: int | None = 15


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    model_config = ConfigDict(from_attributes=True)


class StockReservationResponse(BaseModel):
    id: int
    reservation_code: str
    cart_id: int
    product_id: int
    store_id: int
    quantity: int
    status: str
    expires_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: int
    cart_code: str
    user_id: int | None = None
    store_id: int
    status: str
    expires_at: datetime
    items: list[CartItemResponse] = []
    reservations: list[StockReservationResponse] = []
    ttl_remaining_seconds: int = 0
    model_config = ConfigDict(from_attributes=True)


class CartCheckoutRequest(BaseModel):
    payment_method: str = "CASH"
    fulfillment_type: str = "DELIVERY"  # DELIVERY or STORE_PICKUP
    customer_name: str | None = "Walk-in Customer"


class StorePickupResponse(BaseModel):
    id: int
    pickup_code: str
    sale_id: int
    store_id: int
    customer_name: str
    status: str
    created_at: datetime
    collected_at: datetime | None = None
    collected_by_staff: str | None = None
    model_config = ConfigDict(from_attributes=True)


# Setup Wizard Schemas
class StoreWizardRequest(BaseModel):
    name: str  # e.g. "Harare Main Store"
    phone: str | None = None
    address: str | None = None
    currency: str | None = "USD"
    timezone: str | None = "Africa/Harare"
    manager_id: int | None = None
    create_default_warehouse: bool | None = True


class WarehouseWizardRequest(BaseModel):
    name: str  # e.g. "Harare Central Distribution Hub"
    store_id: int
    type: str | None = "MAIN"  # MAIN, STORE, TRANSIT, RETURNS, QUARANTINE
    manager_id: int | None = None


class EmployeeWizardRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    position: str = "CASHIER"
    department_id: int | None = None
    store_id: int | None = None
    manager_id: int | None = None
    create_user_account: bool | None = False
    password: str | None = "ChangeMe2026!"


# Approval Engine Schemas
class ApprovalRequestCreate(BaseModel):
    request_type: str  # STOCK_ADJUSTMENT, REFUND, PRICE_CHANGE, PRODUCT_DELETE, BELOW_MARGIN_SALE
    entity_name: str | None = None
    entity_id: int | None = None
    amount: float | None = None
    notes: str | None = None
    payload_json: str | None = None


class ApprovalReviewRequest(BaseModel):
    rejection_reason: str | None = None


class ApprovalRequestResponse(BaseModel):
    id: int
    request_code: str
    request_type: str
    requester_id: int
    approver_id: int | None = None
    status: str
    risk_level: str
    entity_name: str | None = None
    entity_id: int | None = None
    amount: float | None = None
    notes: str | None = None
    rejection_reason: str | None = None
    payload_json: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# Reconciliation Engine Schemas
class ReconciliationScanRequest(BaseModel):
    store_id: int | None = None
    warehouse_id: int | None = None


class ReconciliationExceptionResponse(BaseModel):
    id: int
    exception_code: str
    exception_type: str
    store_id: int | None = None
    warehouse_id: int | None = None
    product_id: int
    expected_stock: int
    actual_stock: int
    variance: int
    severity: str
    status: str
    investigation_notes: str | None = None
    resolution_type: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class ExceptionResolveRequest(BaseModel):
    resolution_type: str  # REVERSAL_POSTED, DAMAGE_WRITEOFF, CORRECTION_ADJUSTMENT, SHRINKAGE_CONFIRMED
    investigation_notes: str


# Commercial Pricing Schemas
class PriceRuleCreate(BaseModel):
    product_id: int
    cost_price: float
    selling_price: float
    min_allowed_price: float
    min_margin_pct: float | None = 10.0
    staff_discount_limit_pct: float | None = 2.0
    manager_discount_limit_pct: float | None = 5.0
    negotiation_allowance_pct: float | None = 5.0


class PriceRuleResponse(BaseModel):
    id: int
    product_id: int
    cost_price: float
    selling_price: float
    min_allowed_price: float
    min_margin_pct: float
    staff_discount_limit_pct: float
    manager_discount_limit_pct: float
    negotiation_allowance_pct: float
    effective_from: datetime
    effective_until: datetime | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PriceNegotiationCheckRequest(BaseModel):
    product_id: int
    offered_price: float
    user_role: str = "STAFF"


class PriceNegotiationCheckResponse(BaseModel):
    product_id: int
    offered_price: float
    min_allowed_price: float
    allowed_for_role: bool
    requires_approval: bool
    reason: str


# Procurement GRN & Receiving Schemas
class GoodsReceiptItemCreate(BaseModel):
    product_id: int
    received_quantity: int
    accepted_quantity: int
    rejected_quantity: int | None = 0
    damaged_quantity: int | None = 0
    unit_cost: float
    batch_number: str | None = None
    expiry_date: datetime | None = None
    storage_location: str | None = None
    rejection_reason: str | None = None
    notes: str | None = None


class GoodsReceiptCreate(BaseModel):
    po_id: int
    supplier_id: int
    store_id: int | None = None
    warehouse_id: int | None = None
    delivery_note_ref: str | None = None
    notes: str | None = None
    items: list[GoodsReceiptItemCreate]


class GoodsReceiptItemResponse(BaseModel):
    id: int
    grn_id: int
    product_id: int
    received_quantity: int
    accepted_quantity: int
    rejected_quantity: int
    damaged_quantity: int
    unit_cost: float
    batch_number: str | None = None
    expiry_date: datetime | None = None
    storage_location: str | None = None
    rejection_reason: str | None = None
    notes: str | None = None
    model_config = ConfigDict(from_attributes=True)


class GoodsReceiptResponse(BaseModel):
    id: int
    grn_code: str
    po_id: int
    supplier_id: int
    store_id: int | None = None
    warehouse_id: int | None = None
    received_by_staff_id: int | None = None
    verified_by_manager_id: int | None = None
    status: str
    delivery_note_ref: str | None = None
    notes: str | None = None
    created_at: datetime
    verified_at: datetime | None = None
    items: list[GoodsReceiptItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


class SupplierReturnCreate(BaseModel):
    grn_id: int
    supplier_id: int
    reason: str
    items: list[dict]  # list of {grn_item_id, product_id, returned_quantity, return_reason}


class SupplierReturnResponse(BaseModel):
    id: int
    return_code: str
    grn_id: int
    supplier_id: int
    status: str
    reason: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ThreeWayMatchRequest(BaseModel):
    po_id: int
    supplier_invoice_code: str
    billed_quantity: int
    billed_unit_cost: float


class ThreeWayMatchResponse(BaseModel):
    invoice_id: int
    po_id: int
    three_way_match_status: str  # MATCHED, MISMATCH_QTY, MISMATCH_COST, MISMATCH_BOTH
    status: str  # MATCHED or PAYMENT_HOLD
    mismatch_reason: str | None = None
    ordered_qty: int
    accepted_qty: int
    billed_qty: int
    agreed_unit_cost: float
    billed_unit_cost: float


# System Settings Schemas
class SystemSettingUpdate(BaseModel):
    value: str


class SystemSettingResponse(BaseModel):
    id: int
    key: str
    value: str
    data_type: str
    category: str
    description: str | None = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Payment Method & Proof of Payment (POP) Schemas
class PaymentMethodCreate(BaseModel):
    code: str
    name: str
    type: str | None = "MOBILE_MONEY"  # CASH, MOBILE_MONEY, BANK_TRANSFER, CARD
    merchant_number: str | None = None
    merchant_name: str | None = None
    markup_percentage: float | None = 0.0
    instructions: str | None = None
    requires_pop: bool | None = True


class PaymentMethodResponse(BaseModel):
    id: int
    code: str
    name: str
    type: str
    merchant_number: str | None = None
    merchant_name: str | None = None
    markup_percentage: float
    instructions: str | None = None
    requires_pop: bool
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class POPSubmitRequest(BaseModel):
    payment_method_id: int
    sale_id: int | None = None
    transaction_reference: str
    pop_file_key: str | None = None
    base_amount: float


class POPReviewRequest(BaseModel):
    rejection_reason: str | None = None


class POPVerificationResponse(BaseModel):
    id: int
    pop_code: str
    sale_id: int | None = None
    payment_method_id: int
    transaction_reference: str
    pop_file_key: str | None = None
    base_amount: float
    markup_amount: float
    total_amount_paid: float
    status: str
    rejection_reason: str | None = None
    verified_by_user_id: int | None = None
    created_at: datetime
    verified_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# Device Trust & Session Security Schemas
class DeviceRegisterRequest(BaseModel):
    device_name: str  # e.g. "Chrome 128 / Windows 11"
    fingerprint_raw: str  # Raw browser traits string (e.g. UserAgent|Timezone|ScreenRes|Language)
    ip_address: str | None = None
    user_agent: str | None = None


class DeviceResponse(BaseModel):
    id: int
    device_id: str
    user_id: int
    device_name: str
    fingerprint_hash: str
    ip_address: str | None = None
    first_seen: datetime
    last_seen: datetime
    is_trusted: bool
    is_revoked: bool
    risk_score: float
    model_config = ConfigDict(from_attributes=True)


class SessionResponse(BaseModel):
    id: int
    session_id: str
    user_id: int
    device_id: int | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    location_summary: str
    created_at: datetime
    last_seen: datetime
    expires_at: datetime
    is_revoked: bool
    model_config = ConfigDict(from_attributes=True)


class RiskEvaluationRequest(BaseModel):
    session_id: str
    action_name: str  # e.g. "DELETE_PRODUCT", "APPROVE_LARGE_PO", "CHANGE_PRICE_FLOOR"
    fingerprint_raw: str
    ip_address: str | None = None


class RiskEvaluationResponse(BaseModel):
    session_id: str
    risk_score: float  # 0.0 to 1.0
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    is_device_trusted: bool
    step_up_required: bool  # True if action requires MFA/Manager approval
    reasons: list[str] = []
    model_config = ConfigDict(from_attributes=True)


class InventoryAnomalyResponse(BaseModel):
    id: int
    anomaly_code: str
    product_id: int
    product_sku: str | None = None
    product_name: str | None = None
    warehouse_id: int | None = None
    opening_stock: int
    received_qty: int
    returns_qty: int
    sales_qty: int
    damage_qty: int
    adjustments_qty: int
    expected_stock: int
    system_stock: int
    variance: int
    risk_score: float
    risk_level: str
    status: str
    reasons: list[str] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EvidenceTimelineItem(BaseModel):
    timestamp: str
    event_type: str  # SALE, ADJUSTMENT, DEVICE_CHANGE, RECEIVING, ANOMALY_DETECTED
    actor_name: str
    reference_code: str
    description: str
    details: str | None = None


class InvestigationCaseResponse(BaseModel):
    id: int
    case_code: str
    anomaly_id: int | None = None
    product_id: int
    product_sku: str | None = None
    product_name: str | None = None
    warehouse_name: str | None = None
    expected_stock: int
    actual_stock: int
    variance: int
    risk_score: float
    risk_level: str
    status: str
    evidence_timeline: list[EvidenceTimelineItem] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StockReservationRequest(BaseModel):
    product_id: int
    warehouse_id: int | None = None
    quantity: int
    duration_minutes: int = 15


class StockReservationResponse(BaseModel):
    id: int
    reservation_code: str
    product_id: int
    product_name: str | None = None
    reserved_quantity: int
    status: str
    created_at: datetime
    expires_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ExplainLineageNode(BaseModel):
    label: str
    amount_or_qty: Any
    operation: str  # +, -, =, or summary
    details: str | None = None


class LineageExplanationResponse(BaseModel):
    entity_type: str  # STOCK, REVENUE, MARGIN
    title: str
    current_value: Any
    equation_formula: str
    lineage_items: list[ExplainLineageNode] = []


class BLELocationResponse(BaseModel):
    id: int
    tag_id: str
    product_id: int
    product_sku: str
    product_name: str
    expected_location: str
    detected_location: str
    rssi_dbm: int
    confidence_percentage: float
    has_mismatch: bool
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# DATA INGESTION, STAGING & IMPORT SCHEMAS
# ==========================================


class ImportRecordResponse(BaseModel):
    id: int
    batch_id: str
    row_number: int
    external_id: str | None = None
    canonical_id: str | None = None
    action_type: str = "CREATE"
    raw_data_json: str
    normalized_data_json: str | None = None
    before_snapshot_json: str | None = None
    diff_json: str | None = None
    validation_status: str
    error_message: str | None = None
    error_details_json: str | None = None
    imported_entity_id: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ImportBatchResponse(BaseModel):
    id: int
    batch_id: str
    filename: str
    file_hash: str
    content_hash: str | None = None
    approved_content_hash: str | None = None
    file_size: int | None = 0
    uploader_user_id: int | None = None
    source_type: str
    source_system: str | None = "LOCAL_UPLOAD"
    schema_version: str | None = None
    source_reference: str | None = None
    risk_level: str | None = "LOW"
    entity_type: str
    record_count: int
    valid_count: int
    rejected_count: int
    created_records_count: int | None = 0
    updated_records_count: int | None = 0
    unchanged_records_count: int | None = 0
    status: str
    column_mapping_json: str | None = None
    storage_path: str | None = None
    approval_id: int | None = None
    case_id: str | None = None
    reconciliation_json: str | None = None
    reconciliation_delta: float | None = 0.0
    created_at: datetime
    approved_at: datetime | None = None
    approved_by_user_id: int | None = None
    is_duplicate_warning: bool = False
    previous_batch_id: str | None = None
    model_config = ConfigDict(from_attributes=True)


class BatchPreviewResponse(BaseModel):
    batch_id: str
    entity_type: str
    risk_level: str
    status: str
    content_hash: str | None = None
    total_records: int
    valid_records: int
    rejected_records: int
    create_count: int
    update_count: int
    no_change_count: int
    requires_approval: bool
    uploader_user_id: int | None = None


class BatchReconciliationResponse(BaseModel):
    batch_id: str
    entity_type: str
    source_system: str
    status: str
    total_imported: int
    accepted_count: int
    rejected_count: int
    created_count: int
    updated_count: int
    unchanged_count: int
    reconciliation_delta: float
    is_reconciled: bool
    checksum: str | None = None
    reconciliation_summary: dict[str, Any]


class ImportReconciliationRecordResponse(BaseModel):
    id: int
    batch_id: str
    entity_type: str
    source_system: str
    total_records: int
    accepted_count: int
    rejected_count: int
    created_count: int
    updated_count: int
    unchanged_count: int
    reconciliation_delta: float
    is_reconciled: bool
    previous_checksum: str | None = None
    checksum: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ExternalEntityMappingHistoryResponse(BaseModel):
    id: int
    mapping_id: int | None = None
    entity_type: str
    source_system: str
    external_id: str
    old_internal_code: str | None = None
    new_internal_code: str
    reason: str | None = None
    changed_by_user_id: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)



class ExternalEntityMappingResponse(BaseModel):
    id: int
    entity_type: str
    internal_code: str
    source_system: str
    external_id: str
    metadata_json: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class ExternalEntityMappingCreate(BaseModel):
    entity_type: str
    internal_code: str
    source_system: str
    external_id: str
    metadata_json: str | None = None


class DataDictionaryFieldSchema(BaseModel):
    field_name: str
    canonical_name: str
    data_type: str  # string, float, int, date, boolean
    required: bool
    description: str
    aliases: list[str] = []
    example: str | None = None
    is_identifier: bool = False
    risk_factor: str = "LOW"  # LOW, HIGH


class DataDictionaryContractResponse(BaseModel):
    entity_type: str
    schema_version: str
    category: str  # MASTER_DATA, TRANSACTIONAL, REFERENCE
    risk_level: str  # LOW, HIGH
    description: str
    supported_sources: list[str]  # API, CSV, XLSX, MANUAL
    fields: list[DataDictionaryFieldSchema]



class ColumnMappingRequest(BaseModel):
    entity_type: str  # PRODUCTS, EMPLOYEES, CUSTOMERS, SUPPLIERS, OPENING_STOCK, PURCHASES, SALES
    file_headers: list[str]
    column_mapping: dict[str, str]  # e.g. {"Employee No": "employee_id", "Employee Name": "full_name"}


class ImportStageRequest(BaseModel):
    entity_type: str
    filename: str
    raw_csv_content: str
    column_mapping: dict[str, str] | None = None


class ValidationResultResponse(BaseModel):
    batch_id: str
    total_records: int
    valid_records: int
    rejected_records: int
    status: str
    is_duplicate: bool = False
    duplicate_warning_message: str | None = None
    errors: list[dict[str, Any]] = []


# ==========================================
# INTEGRATION ACCOUNTS & API KEYS SCHEMAS
# ==========================================


class IntegrationAccountCreate(BaseModel):
    name: str
    description: str | None = None
    scopes: list[str] = []  # e.g. ["products:read", "sales:create"]


class IntegrationAccountResponse(BaseModel):
    id: int
    account_id: str
    name: str
    description: str | None = None
    status: str
    scopes: list[str] = []
    created_at: datetime
    expires_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class IntegrationApiKeyCreate(BaseModel):
    name: str  # Key friendly name e.g. "POS Integration Key"


class IntegrationApiKeyResponse(BaseModel):
    id: int
    account_id: str
    name: str
    prefix: str
    plain_text_api_key: str | None = None  # Returned only once on key creation
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class IntegrationActivityLogResponse(BaseModel):
    id: int
    account_id: str
    endpoint: str
    http_method: str
    status_code: int
    ip_address: str
    error_message: str | None = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


# External Integration Payload Schemas (Strict Validation for REST API Integration)
class ExternalProductCreate(BaseModel):
    sku: str
    name: str
    category_name: str | None = "General"
    supplier_name: str | None = None
    purchase_price: float
    selling_price: float
    reorder_level: int = 10
    unit: str = "Units"
    barcode: str | None = None


class ExternalEmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str
    job_title: str | None = "CASHIER"
    department: str | None = "Sales"
    phone: str | None = None


class ExternalCustomerCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None


class ExternalSupplierCreate(BaseModel):
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


class ExternalSaleItemCreate(BaseModel):
    sku: str
    quantity: int
    unit_price: float


class ExternalSaleCreate(BaseModel):
    external_invoice_ref: str
    customer_name: str | None = "Walk-in Customer"
    payment_method: str = "CASH"
    items: list[ExternalSaleItemCreate]


class ExternalPurchaseItemCreate(BaseModel):
    sku: str
    quantity: int
    unit_cost: float


class ExternalPurchaseCreate(BaseModel):
    external_po_ref: str
    supplier_name: str
    items: list[ExternalPurchaseItemCreate]
