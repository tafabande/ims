from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sale
from app.schemas import SaleCreate, SaleResponse
from app.services.iam_service import require_permission
from app.services.inventory_service import process_sale_transaction

router = APIRouter(prefix="/api/sales", tags=["Sales"])


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
