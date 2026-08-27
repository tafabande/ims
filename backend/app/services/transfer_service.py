import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Product, StockTransfer, StockTransferItem, Store
from app.services.inventory_service import process_stock_adjustment


def create_stock_transfer(db: Session, transfer_data, user_name: str = "System Operator") -> StockTransfer:
    source_store = db.query(Store).filter(Store.id == transfer_data.source_store_id).first()
    dest_store = db.query(Store).filter(Store.id == transfer_data.destination_store_id).first()

    if not source_store or not dest_store:
        raise HTTPException(status_code=404, detail="Source or Destination store not found")

    if transfer_data.source_store_id == transfer_data.destination_store_id:
        raise HTTPException(status_code=400, detail="Source and Destination stores cannot be identical")

    transfer_code = f"TRF-2026-{uuid.uuid4().hex[:5].upper()}"
    transfer = StockTransfer(
        transfer_code=transfer_code,
        source_store_id=transfer_data.source_store_id,
        destination_store_id=transfer_data.destination_store_id,
        status="APPROVED",
        requested_by_emp_id=transfer_data.requested_by_emp_id,
        notes=transfer_data.notes,
        created_at=datetime.now(UTC),
    )
    db.add(transfer)
    db.flush()

    for item in transfer_data.items:
        # Check source product stock
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")

        if product.available_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}' at source store. Available: {product.available_quantity}, Requested: {item.quantity}",
            )

        t_item = StockTransferItem(transfer_id=transfer.id, product_id=item.product_id, quantity=item.quantity)
        db.add(t_item)

        # Single transaction dual inventory movement ledger entries:
        # 1) Deduct from source
        process_stock_adjustment(
            db=db,
            product_id=item.product_id,
            quantity=-item.quantity,
            tx_type="TRANSFER_OUT",
            reference=transfer_code,
            user_name=user_name,
            notes=f"Stock Transfer Out to Store #{dest_store.store_code}",
            reason_category="INTER_STORE_TRANSFER",
        )

        # 2) Receive into destination (or global catalog stock increment)
        process_stock_adjustment(
            db=db,
            product_id=item.product_id,
            quantity=item.quantity,
            tx_type="TRANSFER_IN",
            reference=transfer_code,
            user_name=user_name,
            notes=f"Stock Transfer In from Store #{source_store.store_code}",
            reason_category="INTER_STORE_TRANSFER",
        )

    transfer.status = "COMPLETED"
    db.commit()
    db.refresh(transfer)
    return transfer


def get_transfers(db: Session):
    return db.query(StockTransfer).order_by(StockTransfer.id.desc()).all()


def get_transfer_by_id(db: Session, transfer_id: int) -> StockTransfer:
    trf = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not trf:
        raise HTTPException(status_code=404, detail="Stock Transfer not found")
    return trf
