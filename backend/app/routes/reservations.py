from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Cart
from app.schemas import (
    CartCheckoutRequest,
    CartReserveRequest,
    CartResponse,
    SaleResponse,
    StorePickupResponse,
)
from app.services.iam_service import require_permission
from app.services.reservation_service import (
    cancel_cart_reservation,
    checkout_cart_reservation,
    create_cart_reservation,
    mark_pickup_collected,
)

router = APIRouter(prefix="/api/carts", tags=["Inventory Reservations & Cart"])


@router.post("/reserve", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
def reserve_cart_stock(
    payload: CartReserveRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:create")),
):
    cart = create_cart_reservation(
        db=db,
        user_id=payload.user_id,
        store_id=payload.store_id,
        items=[item.model_dump() for item in payload.items],
        ttl_minutes=payload.ttl_minutes or 15,
    )

    now_naive = datetime.now(UTC).replace(tzinfo=None)
    ttl_remaining = max(0, int((cart.expires_at - now_naive).total_seconds()))
    res_data = CartResponse.model_validate(cart)
    res_data.ttl_remaining_seconds = ttl_remaining
    return res_data


@router.get("/{cart_id}", response_model=CartResponse)
def get_cart_status(
    cart_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:read")),
):
    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail=f"Cart ID {cart_id} not found.")

    now_naive = datetime.now(UTC).replace(tzinfo=None)
    ttl_remaining = max(0, int((cart.expires_at - now_naive).total_seconds()))
    res_data = CartResponse.model_validate(cart)
    res_data.ttl_remaining_seconds = ttl_remaining
    return res_data


@router.post("/{cart_id}/checkout")
def checkout_cart(
    cart_id: int,
    payload: CartCheckoutRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:create")),
):
    sale, pickup = checkout_cart_reservation(
        db=db,
        cart_id=cart_id,
        current_user_id=None,
        payment_method=payload.payment_method,
        fulfillment_type=payload.fulfillment_type,
        customer_name=payload.customer_name or "Walk-in Customer",
    )

    res = {
        "sale": SaleResponse.model_validate(sale),
        "store_pickup": StorePickupResponse.model_validate(pickup) if pickup else None,
    }
    return res


@router.delete("/{cart_id}/reserve")
def cancel_reservation(
    cart_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:create")),
):
    return cancel_cart_reservation(db=db, cart_id=cart_id, current_user_id=None)


@router.post("/pickups/{pickup_code}/collect", response_model=StorePickupResponse)
def collect_store_pickup(
    pickup_code: str,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("sales:create")),
):
    pickup = mark_pickup_collected(db=db, pickup_code=pickup_code, staff_user_name="Store Counter Staff")
    return pickup
