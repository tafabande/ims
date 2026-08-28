import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import (
    Cart,
    CartItem,
    Customer,
    InventoryTransaction,
    Product,
    Sale,
    SaleItem,
    StockReservation,
    StorePickupOrder,
)


def expire_stale_reservations(db: Session):
    """
    Sweeps and invalidates expired active stock reservations, restoring available inventory.
    """
    now = datetime.now(UTC).replace(tzinfo=None)
    stale_reservations = (
        db.query(StockReservation).filter(StockReservation.status == "ACTIVE", StockReservation.expires_at <= now).all()
    )

    for res in stale_reservations:
        res.status = "EXPIRED"
        product = db.query(Product).filter(Product.id == res.product_id).with_for_update().first()
        if product:
            product.reserved_quantity = max(0, product.reserved_quantity - res.quantity)

        cart = db.query(Cart).filter(Cart.id == res.cart_id).first()
        if cart and cart.status == "ACTIVE":
            cart.status = "EXPIRED"

    if stale_reservations:
        db.commit()


def create_cart_reservation(
    db: Session,
    user_id: int | None,
    store_id: int,
    items: list[dict],
    ttl_minutes: int = 15,
) -> Cart:
    """
    Atomically creates a cart and time-bound stock reservations using pessimistic locking.
    """
    expire_stale_reservations(db)

    now = datetime.now(UTC).replace(tzinfo=None)
    expires_at = now + timedelta(minutes=ttl_minutes)
    cart_code = f"CART-2026-{uuid.uuid4().hex[:6].upper()}"

    cart = Cart(
        cart_code=cart_code,
        user_id=user_id,
        store_id=store_id,
        status="ACTIVE",
        expires_at=expires_at,
    )
    db.add(cart)
    db.flush()

    for item in items:
        product_id = item["product_id"]
        qty = item["quantity"]

        # Pessimistic row-level lock on Product stock
        product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product ID {product_id} not found.")

        available = max(0, product.stock_quantity - product.reserved_quantity)
        if qty > available:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"Stock Reservation Failed: Product '{product.name}' (SKU: {product.sku}) has only {available} available units (Requested: {qty}).",
            )

        # Reserve inventory commitment
        product.reserved_quantity += qty

        cart_item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            quantity=qty,
            unit_price=product.selling_price,
        )
        db.add(cart_item)

        reservation = StockReservation(
            reservation_code=f"RES-2026-{uuid.uuid4().hex[:6].upper()}",
            cart_id=cart.id,
            product_id=product.id,
            store_id=store_id,
            quantity=qty,
            status="ACTIVE",
            expires_at=expires_at,
        )
        db.add(reservation)

    db.commit()
    db.refresh(cart)
    return cart


def checkout_cart_reservation(
    db: Session,
    cart_id: int,
    current_user_id: int | None,
    payment_method: str = "CASH",
    fulfillment_type: str = "DELIVERY",
    customer_name: str = "Walk-in Customer",
) -> tuple[Sale, StorePickupOrder | None]:
    """
    Converts active stock reservations into a completed Sale and optional Store Pickup Order.
    """
    expire_stale_reservations(db)

    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail=f"Cart ID {cart_id} not found.")

    # IDOR Ownership protection
    if cart.user_id and current_user_id and cart.user_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="IDOR Protection: Unauthorized access to cart reservation.",
        )

    if cart.status != "ACTIVE" or cart.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Cart reservation has expired or is no longer active.",
        )

    cart.status = "CONVERTED"
    total_amount = 0.0

    # Ensure default customer exists or create walk-in
    customer = db.query(Customer).first()
    if not customer:
        customer = Customer(name="Walk-in Customer", email="walkin@ims.local")
        db.add(customer)
        db.flush()
    customer_id = customer.id

    sale_invoice = f"INV-2026-{uuid.uuid4().hex[:6].upper()}"
    sale = Sale(
        invoice_number=sale_invoice,
        customer_id=customer_id,
        total_amount=0.0,
        payment_status="PAID",
        payment_method=payment_method,
        created_by="Cart Reservation Checkout",
    )
    db.add(sale)
    db.flush()

    for item in cart.items:
        product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
        if not product:
            continue

        item_total = item.quantity * item.unit_price
        total_amount += item_total

        qty_before = product.stock_quantity

        # Release reserved commitment & decrement physical stock
        product.reserved_quantity = max(0, product.reserved_quantity - item.quantity)
        product.stock_quantity = max(0, product.stock_quantity - item.quantity)

        qty_after = product.stock_quantity

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(sale_item)

        # Audit ledger event
        txn = InventoryTransaction(
            product_id=product.id,
            type="SALE",
            quantity=-item.quantity,
            quantity_before=qty_before,
            quantity_after=qty_after,
            reason_category="CART_CHECKOUT",
            reference=sale.invoice_number,
            user_name="Cart Checkout",
            notes=f"Converted from Reservation Cart {cart.cart_code}",
        )
        db.add(txn)

    sale.total_amount = total_amount

    # Mark stock reservations converted
    for res in cart.reservations:
        res.status = "CONVERTED"

    pickup_order = None
    if fulfillment_type == "STORE_PICKUP":
        pickup_order = StorePickupOrder(
            pickup_code=f"PICKUP-2026-{uuid.uuid4().hex[:6].upper()}",
            sale_id=sale.id,
            store_id=cart.store_id,
            customer_name=customer_name,
            status="READY_FOR_COLLECTION",
        )
        db.add(pickup_order)

    db.commit()
    db.refresh(sale)
    if pickup_order:
        db.refresh(pickup_order)

    return sale, pickup_order


def cancel_cart_reservation(db: Session, cart_id: int, current_user_id: int | None):
    """
    Cancels an active cart reservation, releasing reserved stock immediately.
    """
    cart = db.query(Cart).filter(Cart.id == cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail=f"Cart ID {cart_id} not found.")

    if cart.user_id and current_user_id and cart.user_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="IDOR Protection: Unauthorized access to cart reservation.",
        )

    if cart.status == "ACTIVE":
        cart.status = "CANCELLED"
        for res in cart.reservations:
            if res.status == "ACTIVE":
                res.status = "CANCELLED"
                product = db.query(Product).filter(Product.id == res.product_id).with_for_update().first()
                if product:
                    product.reserved_quantity = max(0, product.reserved_quantity - res.quantity)
        db.commit()

    return {"message": f"Cart reservation {cart.cart_code} cancelled and stock released."}


def mark_pickup_collected(db: Session, pickup_code: str, staff_user_name: str) -> StorePickupOrder:
    """
    Staff verification marking store pickup order collected.
    """
    pickup = db.query(StorePickupOrder).filter(StorePickupOrder.pickup_code == pickup_code).first()
    if not pickup:
        raise HTTPException(status_code=404, detail=f"Pickup Code '{pickup_code}' not found.")

    if pickup.status == "COLLECTED":
        raise HTTPException(status_code=400, detail="Pickup Order has already been collected.")

    pickup.status = "COLLECTED"
    pickup.collected_at = datetime.utcnow()
    pickup.collected_by_staff = staff_user_name
    db.commit()
    db.refresh(pickup)
    return pickup
