from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import PriceRuleCreate, PriceRuleResponse, PriceNegotiationCheckRequest, PriceNegotiationCheckResponse
from app.services import pricing_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/pricing", tags=["Commercial Pricing & Margin Protection Rules"])

@router.post("/rules", response_model=PriceRuleResponse, status_code=status.HTTP_201_CREATED)
def configure_pricing_rule(
    rule_data: PriceRuleCreate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or App Admin
):
    return pricing_service.configure_product_pricing(
        db=db,
        product_id=rule_data.product_id,
        cost_price=rule_data.cost_price,
        selling_price=rule_data.selling_price,
        min_allowed_price=rule_data.min_allowed_price,
        min_margin_pct=rule_data.min_margin_pct or 10.0,
        staff_discount_limit_pct=rule_data.staff_discount_limit_pct or 2.0,
        manager_discount_limit_pct=rule_data.manager_discount_limit_pct or 5.0,
        negotiation_allowance_pct=rule_data.negotiation_allowance_pct or 5.0
    )

@router.post("/check-negotiation", response_model=PriceNegotiationCheckResponse)
def check_price_negotiation(
    check_data: PriceNegotiationCheckRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read"))
):
    res = pricing_service.check_price_negotiation(
        db,
        check_data.product_id,
        check_data.offered_price,
        check_data.user_role
    )
    return PriceNegotiationCheckResponse(**res)
