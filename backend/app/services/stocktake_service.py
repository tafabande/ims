import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Stocktake, StocktakeItem, Store
from app.services.inventory_service import process_stock_adjustment


def create_stocktake(db: Session, stocktake_data, user_name: str = "System Operator") -> Stocktake:
    store = db.query(Store).filter(Store.id == stocktake_data.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    stk_code = f"STK-2026-{uuid.uuid4().hex[:5].upper()}"
    stocktake = Stocktake(
        stocktake_code=stk_code,
        store_id=stocktake_data.store_id,
        warehouse_id=stocktake_data.warehouse_id,
        status="IN_PROGRESS",
        reason=stocktake_data.reason,
        conducted_by_emp_id=stocktake_data.conducted_by_emp_id,
        created_at=datetime.now(UTC),
    )
    db.add(stocktake)
    db.flush()

    for item in stocktake_data.items:
        variance = item.physical_count - item.system_quantity
        s_item = StocktakeItem(
            stocktake_id=stocktake.id,
            product_id=item.product_id,
            system_quantity=item.system_quantity,
            physical_count=item.physical_count,
            variance_quantity=variance,
            notes=item.notes,
        )
        db.add(s_item)

    db.commit()
    db.refresh(stocktake)
    return stocktake


def approve_stocktake(db: Session, stocktake_id: int, approved_by_emp_id: int, user_name: str = "Manager") -> Stocktake:
    stocktake = db.query(Stocktake).filter(Stocktake.id == stocktake_id).first()
    if not stocktake:
        raise HTTPException(status_code=404, detail="Stocktake session not found")

    if stocktake.status == "APPROVED":
        raise HTTPException(status_code=400, detail="Stocktake has already been approved and posted")

    for s_item in stocktake.items:
        if s_item.variance_quantity != 0:
            # Post inventory adjustment ledger for variance
            tx_type = "ADJUSTMENT" if s_item.variance_quantity > 0 else "WRITE_OFF"
            process_stock_adjustment(
                db=db,
                product_id=s_item.product_id,
                quantity=s_item.variance_quantity,
                tx_type=tx_type,
                reference=stocktake.stocktake_code,
                user_name=user_name,
                notes=f"Stocktake Variance Adjustment ({stocktake.reason}): System={s_item.system_quantity}, Physical={s_item.physical_count}",
                reason_category=stocktake.reason,
            )

    stocktake.status = "APPROVED"
    stocktake.approved_by_emp_id = approved_by_emp_id
    db.commit()
    db.refresh(stocktake)
    return stocktake


def get_stocktakes(db: Session):
    return db.query(Stocktake).order_by(Stocktake.id.desc()).all()


def get_stocktake_by_id(db: Session, stocktake_id: int) -> Stocktake:
    stk = db.query(Stocktake).filter(Stocktake.id == stocktake_id).first()
    if not stk:
        raise HTTPException(status_code=404, detail="Stocktake not found")
    return stk
