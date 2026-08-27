from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import UserContext, get_current_user, require_permission
from app.models import Promotion
from app.schemas import PromotionCreate, PromotionResponse

router = APIRouter(prefix="/api/promotions", tags=["Discounts & Promotions"])


@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
def create_promotion(
    promo_data: PromotionCreate,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("sales:policy")),
):
    existing = db.query(Promotion).filter(Promotion.promo_code == promo_data.promo_code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Promotion code '{promo_data.promo_code}' already exists",
        )

    promo = Promotion(
        promo_code=promo_data.promo_code,
        name=promo_data.name,
        discount_type=promo_data.discount_type,
        value=promo_data.value,
        category_id=promo_data.category_id,
        product_id=promo_data.product_id,
        store_id=promo_data.store_id,
        start_date=promo_data.start_date,
        end_date=promo_data.end_date,
        status="PENDING",  # Requires approval (SoD)
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.post("/{promo_id}/approve", response_model=PromotionResponse)
def approve_promotion(
    promo_id: int,
    approved_by_emp_id: int,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("sales:policy")),
):
    promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    promo.status = "ACTIVE"
    promo.approved_by_emp_id = approved_by_emp_id
    db.commit()
    db.refresh(promo)
    return promo


@router.get("", response_model=list[PromotionResponse])
def list_promotions(
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(get_current_user),
):
    return db.query(Promotion).order_by(Promotion.id.desc()).all()
