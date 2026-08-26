from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

# IAM & Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900 # 15 minutes in seconds
    user_id: str
    role: str
    permissions: List[str]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class SessionResponse(BaseModel):
    session_id: str
    user_id: int
    device_info: str
    ip_address: str
    active: bool
    created_at: datetime

# User Management Schemas
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "STAFF" # ADMIN, MANAGER, STAFF
    department: Optional[str] = "Warehouse"

class UserResponse(BaseModel):
    id: int
    user_code: Optional[str] = None
    email: str
    full_name: str
    role: str
    department: Optional[str]
    active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Organization & Employee Schemas
class DepartmentCreate(BaseModel):
    department_code: str
    name: str
    description: Optional[str] = None

class DepartmentResponse(DepartmentCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JobRoleCreate(BaseModel):
    role_code: str
    name: str
    department_id: int
    description: Optional[str] = None

class JobRoleResponse(JobRoleCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    position: Optional[str] = "CASHIER"
    department_id: Optional[int] = None
    job_role_id: Optional[int] = None
    store_id: Optional[int] = None
    manager_id: Optional[int] = None
    user_id: Optional[int] = None # Optional link to login User Account
    status: str = "ACTIVE" # ACTIVE, INACTIVE, SUSPENDED, TERMINATED

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department_id: Optional[int] = None
    job_role_id: Optional[int] = None
    store_id: Optional[int] = None
    manager_id: Optional[int] = None
    user_id: Optional[int] = None
    status: Optional[str] = None

class EmployeeResponse(EmployeeCreate):
    id: int
    employee_code: str
    store_name: Optional[str] = None
    manager_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EmployeeActivityResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    position: Optional[str] = None
    store_id: Optional[int] = None
    status: str
    total_sales_count: int = 0
    total_sales_amount: float = 0.0
    total_returns_count: int = 0
    total_adjustments_count: int = 0
    last_activity_timestamp: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Category Schemas
class CategoryBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    category_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CategoryTreeResponse(CategoryResponse):
    children: List['CategoryTreeResponse'] = []
    model_config = ConfigDict(from_attributes=True)

# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Customer Schemas
class CustomerBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Product Schemas
class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category_id: int
    supplier_id: Optional[int] = None
    purchase_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    stock_quantity: int = Field(ge=0, default=0)
    reserved_quantity: int = Field(ge=0, default=0)
    reorder_level: int = Field(ge=0, default=5)
    unit: str = "Units"
    barcode: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    unit: Optional[str] = None
    barcode: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    product_code: Optional[str] = None
    active: bool
    available_quantity: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Inventory Transaction Schemas
class InventoryAdjustmentRequest(BaseModel):
    product_id: int
    quantity: int # positive for increase, negative for decrease
    type: str = "ADJUSTMENT"
    reason_category: Optional[str] = "CORRECTION"
    reference: Optional[str] = None
    notes: Optional[str] = None
    user_name: Optional[str] = "System Operator"

class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    po_number: Optional[str] = None
    notes: Optional[str] = None

class StockDamageRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    notes: str = Field(min_length=3)

class StockReturnRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    customer_id: Optional[int] = None
    notes: Optional[str] = None

class InventoryTransactionResponse(BaseModel):
    id: int
    product_id: int
    type: str
    quantity: int
    quantity_before: int
    quantity_after: int
    reason_category: Optional[str]
    reference: Optional[str]
    user_name: Optional[str]
    notes: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Purchase Order Schemas
class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)

class PurchaseCreate(BaseModel):
    supplier_id: int
    items: List[PurchaseItemCreate]

class PurchaseResponse(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    status: str
    total_amount: float
    created_at: datetime
    received_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)

# Sale Schemas
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class SaleCreate(BaseModel):
    customer_id: int
    payment_method: str = "Credit Card"
    items: List[SaleItemCreate]

class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    total_amount: float
    payment_status: str
    payment_method: str
    created_at: datetime
    created_by: Optional[str]
    model_config = ConfigDict(from_attributes=True)

# Store & Warehouse Schemas
class StoreCreate(BaseModel):
    store_code: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[int] = None
    status: str = "ACTIVE"
    operating_hours: Optional[str] = "08:00 - 18:00"

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
    current_operator_id: Optional[int] = None
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
    supervisor_id: Optional[int] = None

class ShiftResponse(BaseModel):
    id: int
    shift_code: str
    employee_id: int
    store_id: int
    register_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    opening_cash: float
    sales_total: float
    refunds_total: float
    expected_cash: float
    actual_cash: Optional[float] = None
    variance: Optional[float] = None
    status: str
    supervisor_id: Optional[int] = None
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
    reason_category: str = "DEFECTIVE" # DEFECTIVE, WRONG_ITEM, EXPIRED, CUSTOMER_CHANGE
    is_damaged: bool = False
    restock_approved: bool = True
    approved_by_emp_id: Optional[int] = None
    items: List[ReturnItemCreate]

class ReturnItemResponse(ReturnItemCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ReturnOrderResponse(BaseModel):
    id: int
    return_code: str
    sale_id: int
    customer_id: Optional[int] = None
    store_id: Optional[int] = None
    total_refund_amount: float
    reason_category: str
    is_damaged: bool
    restock_approved: bool
    status: str
    created_at: datetime
    items: List[ReturnItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Stock Transfers Schemas
class StockTransferItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class StockTransferCreate(BaseModel):
    source_store_id: int
    destination_store_id: int
    requested_by_emp_id: Optional[int] = None
    notes: Optional[str] = None
    items: List[StockTransferItemCreate]

class StockTransferItemResponse(StockTransferItemCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class StockTransferResponse(BaseModel):
    id: int
    transfer_code: str
    source_store_id: int
    destination_store_id: int
    status: str
    requested_by_emp_id: Optional[int] = None
    approved_by_emp_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[StockTransferItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Stocktake Schemas
class StocktakeItemCreate(BaseModel):
    product_id: int
    system_quantity: int
    physical_count: int
    notes: Optional[str] = None

class StocktakeCreate(BaseModel):
    store_id: int
    warehouse_id: Optional[int] = None
    reason: str = "PERIODIC_AUDIT"
    conducted_by_emp_id: Optional[int] = None
    items: List[StocktakeItemCreate]

class StocktakeItemResponse(StocktakeItemCreate):
    id: int
    variance_quantity: int
    model_config = ConfigDict(from_attributes=True)

class StocktakeResponse(BaseModel):
    id: int
    stocktake_code: str
    store_id: int
    warehouse_id: Optional[int] = None
    status: str
    reason: str
    conducted_by_emp_id: Optional[int] = None
    approved_by_emp_id: Optional[int] = None
    created_at: datetime
    items: List[StocktakeItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Promotions Schemas
class PromotionCreate(BaseModel):
    promo_code: str
    name: str
    discount_type: str # PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y
    value: float = Field(gt=0)
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    store_id: Optional[int] = None
    start_date: datetime
    end_date: datetime

class PromotionResponse(PromotionCreate):
    id: int
    status: str
    created_by_emp_id: Optional[int] = None
    approved_by_emp_id: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Cart & Stock Reservation Schemas
class CartItemReserve(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class CartReserveRequest(BaseModel):
    store_id: int
    user_id: Optional[int] = None
    items: List[CartItemReserve]
    ttl_minutes: Optional[int] = 15

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
    user_id: Optional[int] = None
    store_id: int
    status: str
    expires_at: datetime
    items: List[CartItemResponse] = []
    reservations: List[StockReservationResponse] = []
    ttl_remaining_seconds: int = 0
    model_config = ConfigDict(from_attributes=True)

class CartCheckoutRequest(BaseModel):
    payment_method: str = "CASH"
    fulfillment_type: str = "DELIVERY" # DELIVERY or STORE_PICKUP
    customer_name: Optional[str] = "Walk-in Customer"

class StorePickupResponse(BaseModel):
    id: int
    pickup_code: str
    sale_id: int
    store_id: int
    customer_name: str
    status: str
    created_at: datetime
    collected_at: Optional[datetime] = None
    collected_by_staff: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Setup Wizard Schemas
class StoreWizardRequest(BaseModel):
    name: str # e.g. "Harare Main Store"
    phone: Optional[str] = None
    address: Optional[str] = None
    currency: Optional[str] = "USD"
    timezone: Optional[str] = "Africa/Harare"
    manager_id: Optional[int] = None
    create_default_warehouse: Optional[bool] = True

class WarehouseWizardRequest(BaseModel):
    name: str # e.g. "Harare Central Distribution Hub"
    store_id: int
    type: Optional[str] = "MAIN" # MAIN, STORE, TRANSIT, RETURNS, QUARANTINE
    manager_id: Optional[int] = None

class EmployeeWizardRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    position: str = "CASHIER"
    department_id: Optional[int] = None
    store_id: Optional[int] = None
    manager_id: Optional[int] = None
    create_user_account: Optional[bool] = False
    password: Optional[str] = "ChangeMe2026!"

# Approval Engine Schemas
class ApprovalRequestCreate(BaseModel):
    request_type: str # STOCK_ADJUSTMENT, REFUND, PRICE_CHANGE, PRODUCT_DELETE, BELOW_MARGIN_SALE
    entity_name: Optional[str] = None
    entity_id: Optional[int] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
    payload_json: Optional[str] = None

class ApprovalReviewRequest(BaseModel):
    rejection_reason: Optional[str] = None

class ApprovalRequestResponse(BaseModel):
    id: int
    request_code: str
    request_type: str
    requester_id: int
    approver_id: Optional[int] = None
    status: str
    risk_level: str
    entity_name: Optional[str] = None
    entity_id: Optional[int] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    payload_json: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Reconciliation Engine Schemas
class ReconciliationScanRequest(BaseModel):
    store_id: Optional[int] = None
    warehouse_id: Optional[int] = None

class ReconciliationExceptionResponse(BaseModel):
    id: int
    exception_code: str
    exception_type: str
    store_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    product_id: int
    expected_stock: int
    actual_stock: int
    variance: int
    severity: str
    status: str
    investigation_notes: Optional[str] = None
    resolution_type: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ExceptionResolveRequest(BaseModel):
    resolution_type: str # REVERSAL_POSTED, DAMAGE_WRITEOFF, CORRECTION_ADJUSTMENT, SHRINKAGE_CONFIRMED
    investigation_notes: str

# Commercial Pricing Schemas
class PriceRuleCreate(BaseModel):
    product_id: int
    cost_price: float
    selling_price: float
    min_allowed_price: float
    min_margin_pct: Optional[float] = 10.0
    staff_discount_limit_pct: Optional[float] = 2.0
    manager_discount_limit_pct: Optional[float] = 5.0
    negotiation_allowance_pct: Optional[float] = 5.0

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
    effective_until: Optional[datetime] = None
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
    rejected_quantity: Optional[int] = 0
    damaged_quantity: Optional[int] = 0
    unit_cost: float
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    storage_location: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None

class GoodsReceiptCreate(BaseModel):
    po_id: int
    supplier_id: int
    store_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    delivery_note_ref: Optional[str] = None
    notes: Optional[str] = None
    items: List[GoodsReceiptItemCreate]

class GoodsReceiptItemResponse(BaseModel):
    id: int
    grn_id: int
    product_id: int
    received_quantity: int
    accepted_quantity: int
    rejected_quantity: int
    damaged_quantity: int
    unit_cost: float
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    storage_location: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class GoodsReceiptResponse(BaseModel):
    id: int
    grn_code: str
    po_id: int
    supplier_id: int
    store_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    received_by_staff_id: Optional[int] = None
    verified_by_manager_id: Optional[int] = None
    status: str
    delivery_note_ref: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    verified_at: Optional[datetime] = None
    items: List[GoodsReceiptItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class SupplierReturnCreate(BaseModel):
    grn_id: int
    supplier_id: int
    reason: str
    items: List[dict] # list of {grn_item_id, product_id, returned_quantity, return_reason}

class SupplierReturnResponse(BaseModel):
    id: int
    return_code: str
    grn_id: int
    supplier_id: int
    status: str
    reason: Optional[str] = None
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
    three_way_match_status: str # MATCHED, MISMATCH_QTY, MISMATCH_COST, MISMATCH_BOTH
    status: str # MATCHED or PAYMENT_HOLD
    mismatch_reason: Optional[str] = None
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
    description: Optional[str] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Payment Method & Proof of Payment (POP) Schemas
class PaymentMethodCreate(BaseModel):
    code: str
    name: str
    type: Optional[str] = "MOBILE_MONEY" # CASH, MOBILE_MONEY, BANK_TRANSFER, CARD
    merchant_number: Optional[str] = None
    merchant_name: Optional[str] = None
    markup_percentage: Optional[float] = 0.0
    instructions: Optional[str] = None
    requires_pop: Optional[bool] = True

class PaymentMethodResponse(BaseModel):
    id: int
    code: str
    name: str
    type: str
    merchant_number: Optional[str] = None
    merchant_name: Optional[str] = None
    markup_percentage: float
    instructions: Optional[str] = None
    requires_pop: bool
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class POPSubmitRequest(BaseModel):
    payment_method_id: int
    sale_id: Optional[int] = None
    transaction_reference: str
    pop_file_key: Optional[str] = None
    base_amount: float

class POPReviewRequest(BaseModel):
    rejection_reason: Optional[str] = None

class POPVerificationResponse(BaseModel):
    id: int
    pop_code: str
    sale_id: Optional[int] = None
    payment_method_id: int
    transaction_reference: str
    pop_file_key: Optional[str] = None
    base_amount: float
    markup_amount: float
    total_amount_paid: float
    status: str
    rejection_reason: Optional[str] = None
    verified_by_user_id: Optional[int] = None
    created_at: datetime
    verified_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Device Trust & Session Security Schemas
class DeviceRegisterRequest(BaseModel):
    device_name: str # e.g. "Chrome 128 / Windows 11"
    fingerprint_raw: str # Raw browser traits string (e.g. UserAgent|Timezone|ScreenRes|Language)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class DeviceResponse(BaseModel):
    id: int
    device_id: str
    user_id: int
    device_name: str
    fingerprint_hash: str
    ip_address: Optional[str] = None
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
    device_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location_summary: str
    created_at: datetime
    last_seen: datetime
    expires_at: datetime
    is_revoked: bool
    model_config = ConfigDict(from_attributes=True)

class RiskEvaluationRequest(BaseModel):
    session_id: str
    action_name: str # e.g. "DELETE_PRODUCT", "APPROVE_LARGE_PO", "CHANGE_PRICE_FLOOR"
    fingerprint_raw: str
    ip_address: Optional[str] = None

class RiskEvaluationResponse(BaseModel):
    session_id: str
    risk_score: float # 0.0 to 1.0
    risk_level: str # LOW, MEDIUM, HIGH, CRITICAL
    is_device_trusted: bool
    step_up_required: bool # True if action requires MFA/Manager approval
    reasons: List[str] = []
    model_config = ConfigDict(from_attributes=True)

class InventoryAnomalyResponse(BaseModel):
    id: int
    anomaly_code: str
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    warehouse_id: Optional[int] = None
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
    reasons: List[str] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EvidenceTimelineItem(BaseModel):
    timestamp: str
    event_type: str # SALE, ADJUSTMENT, DEVICE_CHANGE, RECEIVING, ANOMALY_DETECTED
    actor_name: str
    reference_code: str
    description: str
    details: Optional[str] = None

class InvestigationCaseResponse(BaseModel):
    id: int
    case_code: str
    anomaly_id: Optional[int] = None
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    warehouse_name: Optional[str] = None
    expected_stock: int
    actual_stock: int
    variance: int
    risk_score: float
    risk_level: str
    status: str
    evidence_timeline: List[EvidenceTimelineItem] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StockReservationRequest(BaseModel):
    product_id: int
    warehouse_id: Optional[int] = None
    quantity: int
    duration_minutes: int = 15

class StockReservationResponse(BaseModel):
    id: int
    reservation_code: str
    product_id: int
    product_name: Optional[str] = None
    reserved_quantity: int
    status: str
    created_at: datetime
    expires_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ExplainLineageNode(BaseModel):
    label: str
    amount_or_qty: Any
    operation: str # +, -, =, or summary
    details: Optional[str] = None

class LineageExplanationResponse(BaseModel):
    entity_type: str # STOCK, REVENUE, MARGIN
    title: str
    current_value: Any
    equation_formula: str
    lineage_items: List[ExplainLineageNode] = []

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
    raw_data_json: str
    normalized_data_json: Optional[str] = None
    validation_status: str
    error_message: Optional[str] = None
    imported_entity_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ImportBatchResponse(BaseModel):
    id: int
    batch_id: str
    filename: str
    file_hash: str
    file_size: Optional[int] = 0
    uploader_user_id: Optional[int] = None
    source_type: str
    entity_type: str
    record_count: int
    valid_count: int
    rejected_count: int
    status: str
    column_mapping_json: Optional[str] = None
    storage_path: Optional[str] = None
    approval_id: Optional[int] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    approved_by_user_id: Optional[int] = None
    is_duplicate_warning: bool = False
    previous_batch_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ColumnMappingRequest(BaseModel):
    entity_type: str # PRODUCTS, EMPLOYEES, CUSTOMERS, SUPPLIERS, OPENING_STOCK, PURCHASES, SALES
    file_headers: List[str]
    column_mapping: Dict[str, str] # e.g. {"Employee No": "employee_id", "Employee Name": "full_name"}

class ImportStageRequest(BaseModel):
    entity_type: str
    filename: str
    raw_csv_content: str
    column_mapping: Optional[Dict[str, str]] = None

class ValidationResultResponse(BaseModel):
    batch_id: str
    total_records: int
    valid_records: int
    rejected_records: int
    status: str
    is_duplicate: bool = False
    duplicate_warning_message: Optional[str] = None
    errors: List[Dict[str, Any]] = []

# ==========================================
# INTEGRATION ACCOUNTS & API KEYS SCHEMAS
# ==========================================

class IntegrationAccountCreate(BaseModel):
    name: str
    description: Optional[str] = None
    scopes: List[str] = [] # e.g. ["products:read", "sales:create"]

class IntegrationAccountResponse(BaseModel):
    id: int
    account_id: str
    name: str
    description: Optional[str] = None
    status: str
    scopes: List[str] = []
    created_at: datetime
    expires_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class IntegrationApiKeyCreate(BaseModel):
    name: str # Key friendly name e.g. "POS Integration Key"

class IntegrationApiKeyResponse(BaseModel):
    id: int
    account_id: str
    name: str
    prefix: str
    plain_text_api_key: Optional[str] = None # Returned only once on key creation
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class IntegrationActivityLogResponse(BaseModel):
    id: int
    account_id: str
    endpoint: str
    http_method: str
    status_code: int
    ip_address: str
    error_message: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# External Integration Payload Schemas (Strict Validation for REST API Integration)
class ExternalProductCreate(BaseModel):
    sku: str
    name: str
    category_name: Optional[str] = "General"
    supplier_name: Optional[str] = None
    purchase_price: float
    selling_price: float
    reorder_level: int = 10
    unit: str = "Units"
    barcode: Optional[str] = None

class ExternalEmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str
    job_title: Optional[str] = "CASHIER"
    department: Optional[str] = "Sales"
    phone: Optional[str] = None

class ExternalCustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class ExternalSupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ExternalSaleItemCreate(BaseModel):
    sku: str
    quantity: int
    unit_price: float

class ExternalSaleCreate(BaseModel):
    external_invoice_ref: str
    customer_name: Optional[str] = "Walk-in Customer"
    payment_method: str = "CASH"
    items: List[ExternalSaleItemCreate]

class ExternalPurchaseItemCreate(BaseModel):
    sku: str
    quantity: int
    unit_cost: float

class ExternalPurchaseCreate(BaseModel):
    external_po_ref: str
    supplier_name: str
    items: List[ExternalPurchaseItemCreate]




