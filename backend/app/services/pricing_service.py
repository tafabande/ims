from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import PriceHistory, PriceRule, Product
from app.services.settings_service import get_setting_value


def configure_product_pricing(
    db: Session,
    product_id: int,
    cost_price: float,
    selling_price: float,
    min_allowed_price: float,
    min_margin_pct: float | None = None,
    staff_discount_limit_pct: float | None = None,
    manager_discount_limit_pct: float | None = None,
    negotiation_allowance_pct: float | None = None,
    user_id: int | None = None,
    reason: str | None = "Pricing Configuration Update",
) -> PriceRule:
    """
    Configure Commercial Pricing & Margin Protection Rules for a Product.
    Enforces minimum margin protection from Database Settings if unspecified.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if min_margin_pct is None:
        min_margin_pct = get_setting_value(db, "pricing.minimum_margin", 10.0)
    if staff_discount_limit_pct is None:
        staff_discount_limit_pct = get_setting_value(db, "sales.max_staff_discount", 2.0)
    if manager_discount_limit_pct is None:
        manager_discount_limit_pct = get_setting_value(db, "sales.max_manager_discount", 5.0)
    if negotiation_allowance_pct is None:
        negotiation_allowance_pct = get_setting_value(db, "sales.max_staff_discount", 5.0)

    # Calculate Minimum Margin Price Floor
    min_margin_floor = cost_price * (1 + (min_margin_pct / 100.0))
    if min_allowed_price < min_margin_floor:
        raise HTTPException(
            status_code=400,
            detail=f"Margin Violation: Minimum allowed price (${min_allowed_price:.2f}) is below the required {min_margin_pct}% margin floor (${min_margin_floor:.2f}). Approval required for below-cost/below-margin pricing.",
        )

    rule = db.query(PriceRule).filter(PriceRule.product_id == product_id).first()
    now = datetime.now(UTC)

    if not rule:
        rule = PriceRule(
            product_id=product_id,
            cost_price=cost_price,
            selling_price=selling_price,
            min_allowed_price=min_allowed_price,
            min_margin_pct=min_margin_pct,
            staff_discount_limit_pct=staff_discount_limit_pct,
            manager_discount_limit_pct=manager_discount_limit_pct,
            negotiation_allowance_pct=negotiation_allowance_pct,
            effective_from=now,
            created_at=now,
        )
        db.add(rule)
    else:
        rule.cost_price = cost_price
        rule.selling_price = selling_price
        rule.min_allowed_price = min_allowed_price
        rule.min_margin_pct = min_margin_pct
        rule.staff_discount_limit_pct = staff_discount_limit_pct
        rule.manager_discount_limit_pct = manager_discount_limit_pct
        rule.negotiation_allowance_pct = negotiation_allowance_pct
        rule.updated_at = now

    product.purchase_price = cost_price
    product.selling_price = selling_price

    active_hist = (
        db.query(PriceHistory)
        .filter(PriceHistory.product_id == product_id, PriceHistory.effective_until.is_(None))
        .first()
    )
    if active_hist:
        active_hist.effective_until = now

    new_hist = PriceHistory(
        product_id=product_id,
        cost_price=cost_price,
        selling_price=selling_price,
        min_allowed_price=min_allowed_price,
        reason=reason,
        changed_by_user_id=user_id,
        effective_from=now,
    )
    db.add(new_hist)

    db.commit()
    db.refresh(rule)
    return rule


def check_price_negotiation(
    db: Session,
    product_id: int,
    offered_price: float,
    user_role: str = "STAFF",
    user_permissions: list[str] | None = None,
) -> dict:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    rule = db.query(PriceRule).filter(PriceRule.product_id == product_id).first()
    base_selling_price = rule.selling_price if rule else product.selling_price
    min_allowed_price = rule.min_allowed_price if rule else (base_selling_price * 0.95)

    default_staff_limit = get_setting_value(db, "sales.max_staff_discount", 2.0)
    default_mgr_limit = get_setting_value(db, "sales.max_manager_discount", 5.0)

    staff_limit_pct = rule.staff_discount_limit_pct if rule else default_staff_limit
    manager_limit_pct = rule.manager_discount_limit_pct if rule else default_mgr_limit

    discount_amt = base_selling_price - offered_price
    discount_pct = (discount_amt / base_selling_price) * 100.0 if base_selling_price > 0 else 0.0

    allowed_for_role = True
    requires_approval = False
    reason = "Offered price is within authorized negotiation bounds."

    # Determine authority level based on permissions or role
    has_mgr_authority = (
        (user_permissions and ("sales.approve_large" in user_permissions or "sales.policy" in user_permissions))
        or (user_role.upper() in ["MANAGER", "APP_ADMIN", "ADMIN", "SYSADMIN"])
    )

    if offered_price < min_allowed_price:
        allowed_for_role = False
        requires_approval = True
        reason = f"BLOCKED: Offered price (${offered_price:.2f}) is below minimum allowed price floor (${min_allowed_price:.2f}). Approval request required."
    elif not has_mgr_authority and discount_pct > staff_limit_pct:
        allowed_for_role = False
        requires_approval = True
        reason = f"EXCEEDS STAFF LIMIT: Discount ({discount_pct:.1f}%) exceeds staff negotiation limit ({staff_limit_pct}%). Manager approval required."
    elif has_mgr_authority and discount_pct > manager_limit_pct:
        allowed_for_role = False
        requires_approval = True
        reason = f"EXCEEDS MANAGER LIMIT: Discount ({discount_pct:.1f}%) exceeds manager limit ({manager_limit_pct}%). Executive approval required."

    return {
        "product_id": product_id,
        "offered_price": offered_price,
        "min_allowed_price": min_allowed_price,
        "allowed_for_role": allowed_for_role,
        "requires_approval": requires_approval,
        "reason": reason,
    }


def get_price_history(db: Session, product_id: int) -> list[PriceHistory]:
    return (
        db.query(PriceHistory)
        .filter(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.effective_from.desc())
        .all()
    )
