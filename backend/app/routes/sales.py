from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sale
from app.schemas import SaleCreate, SaleResponse
from app.services.iam_service import require_permission
from app.services.inventory_service import process_sale_transaction
from app.services.settings_service import get_setting_value, update_setting

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.get("/policy")
def get_sales_policy(db: Session = Depends(get_db)):
    return {
        "zigExchangeRate": get_setting_value(db, "sales.zig_exchange_rate", 13.50),
        "maxCashierDiscountPct": get_setting_value(db, "sales.max_staff_discount", 2.0),
        "maxManagerDiscountPct": get_setting_value(db, "sales.max_manager_discount", 5.0),
        "highValueApprovalThreshold": get_setting_value(db, "sales.refund_approval_threshold", 100.0),
        "standardTaxRatePct": get_setting_value(db, "sales.tax_rate", 10.0),
        "allowNegativeStockSale": get_setting_value(db, "sales.allow_negative_stock", False),
    }


@router.put("/policy")
def update_sales_policy(
    policy_data: dict,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:policy")),
):
    if "zigExchangeRate" in policy_data:
        update_setting(db, "sales.zig_exchange_rate", str(policy_data["zigExchangeRate"]))
    if "maxCashierDiscountPct" in policy_data:
        update_setting(db, "sales.max_staff_discount", str(policy_data["maxCashierDiscountPct"]))
    if "highValueApprovalThreshold" in policy_data:
        update_setting(db, "sales.refund_approval_threshold", str(policy_data["highValueApprovalThreshold"]))
    return get_sales_policy(db)


@router.get("/", response_model=list[SaleResponse])
def get_sales(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:read")),
):
    sales = db.query(Sale).order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    return sales


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale_in: SaleCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:create")),
):
    sale = process_sale_transaction(
        db=db,
        customer_id=sale_in.customer_id,
        items=sale_in.items,
        payment_method=sale_in.payment_method,
        user_name="POS Operator",
    )
    return sale
