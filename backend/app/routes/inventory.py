from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import (
    InventoryAdjustmentRequest, 
    StockReceiveRequest, 
    StockDamageRequest, 
    StockReturnRequest,
    InventoryTransactionResponse
)
from app.services.inventory_service import process_stock_adjustment
from app.models import InventoryTransaction
from app.services.cache_service import delete_cache, invalidate_pattern
from app.dependencies import require_permission

router = APIRouter(prefix="/api/inventory", tags=["Inventory Operations"])

@router.get("/transactions", response_model=List[InventoryTransactionResponse])
def get_inventory_transactions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:read"))
):
    """
    Get audit list of inventory transactions with quantity_before and quantity_after snapshots.
    """
    return db.query(InventoryTransaction).order_by(InventoryTransaction.id.desc()).offset(skip).limit(limit).all()

@router.post("/adjust")
def adjust_stock(
    req: InventoryAdjustmentRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:adjust"))
):
    """
    Atomic Stock Adjustment Endpoint using pessimistic row-level locking.
    """
    updated_product = process_stock_adjustment(
        db=db,
        product_id=req.product_id,
        quantity=req.quantity,
        tx_type=req.type,
        reference=req.reference or "MANUAL-ADJUST",
        user_name=req.user_name or current_user.get("sub", "System Operator"),
        notes=req.notes,
        reason_category=req.reason_category or "CORRECTION"
    )
    res_id = updated_product.id
    res_stock = updated_product.stock_quantity
    db.commit()

    delete_cache(f"product:{req.product_id}")
    invalidate_pattern("products:*")
    invalidate_pattern("dashboard:*")

    return {
        "status": "success",
        "product_id": res_id,
        "new_stock_quantity": res_stock
    }

@router.post("/receive")
def receive_stock(
    req: StockReceiveRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:adjust"))
):
    """
    Explicit business operation: Receive stock from supplier/purchase order.
    """
    updated_product = process_stock_adjustment(
        db=db,
        product_id=req.product_id,
        quantity=req.quantity,
        tx_type="PURCHASE",
        reference=req.po_number or "RCV-STOCK",
        user_name="Supplier Inbound",
        notes=req.notes or "Stock received from supplier",
        reason_category="STOCK_RECEIVE"
    )
    res_id = updated_product.id
    res_stock = updated_product.stock_quantity
    db.commit()

    delete_cache(f"product:{req.product_id}")
    invalidate_pattern("products:*")

    return {
        "status": "success",
        "product_id": res_id,
        "new_stock_quantity": res_stock
    }

@router.post("/damage")
def record_damaged_stock(
    req: StockDamageRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:adjust"))
):
    """
    Explicit business operation: Record damaged stock write-off.
    """
    updated_product = process_stock_adjustment(
        db=db,
        product_id=req.product_id,
        quantity=-req.quantity,
        tx_type="ADJUSTMENT",
        reference="DAMAGE-WO",
        user_name="Warehouse Operator",
        notes=req.notes,
        reason_category="DAMAGED"
    )
    res_id = updated_product.id
    res_stock = updated_product.stock_quantity
    db.commit()

    delete_cache(f"product:{req.product_id}")
    invalidate_pattern("products:*")

    return {
        "status": "success",
        "product_id": res_id,
        "new_stock_quantity": res_stock
    }

@router.post("/return")
def process_customer_return(
    req: StockReturnRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:read"))
):
    """
    Explicit business operation: Process customer return.
    """
    updated_product = process_stock_adjustment(
        db=db,
        product_id=req.product_id,
        quantity=req.quantity,
        tx_type="RETURN",
        reference=f"RET-CUST-{req.customer_id or 'GENERIC'}",
        user_name="POS Operator",
        notes=req.notes or "Customer return",
        reason_category="RETURNED"
    )
    res_id = updated_product.id
    res_stock = updated_product.stock_quantity
    db.commit()

    delete_cache(f"product:{req.product_id}")
    invalidate_pattern("products:*")

    return {
        "status": "success",
        "product_id": res_id,
        "new_stock_quantity": res_stock
    }
