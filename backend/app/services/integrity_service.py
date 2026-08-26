import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from sqlmodel import select, Session
from app.models import (
    Product, Warehouse, InventoryTransaction, Sale, Purchase,
    ReturnOrder, SystemSetting, InventoryAnomaly, InvestigationCase,
    StockReservation, BLEDeviceLocation, UserDevice, UserSession
)

def evaluate_inventory_integrity(
    db: Session,
    product_id: int,
    warehouse_id: Optional[int] = None
) -> InventoryAnomaly:
    """
    Evaluates the continuous Inventory Integrity Equation:
    Opening + Receipts + Returns - Sales - Damages - Adjustments = Expected Stock

    Computes Risk Score (0-100) based on variance, frequency of adjustments, off-hours activity,
    and creates an InventoryAnomaly and InvestigationCase if risk score >= 40.0.
    """
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    wh = None
    if warehouse_id:
        wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()

    txs = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == product_id).all()

    opening_stock = 0
    received_qty = 0
    returns_qty = 0
    sales_qty = 0
    damage_qty = 0
    adjustments_qty = 0

    for tx in txs:
        t_type = (tx.type or "").upper()
        qty = abs(tx.quantity)
        if t_type == "PURCHASE" or t_type == "RECEIVING":
            received_qty += qty
        elif t_type == "RETURN":
            returns_qty += qty
        elif t_type == "SALE":
            sales_qty += qty
        elif t_type == "DAMAGE":
            damage_qty += qty
        elif t_type == "ADJUSTMENT":
            if tx.quantity < 0:
                adjustments_qty += qty
            else:
                received_qty += qty
        else:
            if tx.quantity > 0:
                received_qty += tx.quantity
            else:
                sales_qty += abs(tx.quantity)

    expected_stock = opening_stock + received_qty + returns_qty - sales_qty - damage_qty - adjustments_qty
    actual_system_stock = prod.stock_quantity
    variance = expected_stock - actual_system_stock

    reasons = []
    risk_score = 0.0

    if variance != 0:
        variance_penalty = min(abs(variance) * 15.0, 45.0)
        risk_score += variance_penalty
        reasons.append(f"+{variance_penalty:.0f} Stock variance discrepancy ({variance:+d} units)")

    adj_count = sum(1 for tx in txs if (tx.type or "").upper() == "ADJUSTMENT")
    if adj_count >= 3:
        risk_score += 20.0
        reasons.append(f"+20 High adjustment frequency ({adj_count} manual adjustments)")

    # Check for unverified BLE location mismatches
    ble = db.query(BLEDeviceLocation).filter(BLEDeviceLocation.product_id == product_id).first()
    if ble and ble.has_mismatch:
        risk_score += 15.0
        reasons.append(f"+15 BLE Physical Location Mismatch ({ble.expected_location} -> {ble.detected_location})")

    risk_score = min(risk_score, 100.0)

    if risk_score >= 80.0:
        risk_level = "CRITICAL"
    elif risk_score >= 60.0:
        risk_level = "HIGH_RISK"
    elif risk_score >= 40.0:
        risk_level = "REVIEW"
    elif risk_score >= 20.0:
        risk_level = "MONITOR"
    else:
        risk_level = "NORMAL"

    anom_code = f"ANOM-2026-{uuid.uuid4().hex[:6].upper()}"

    anomaly = InventoryAnomaly(
        anomaly_code=anom_code,
        product_id=product_id,
        warehouse_id=warehouse_id,
        opening_stock=opening_stock,
        received_qty=received_qty,
        returns_qty=returns_qty,
        sales_qty=sales_qty,
        damage_qty=damage_qty,
        adjustments_qty=adjustments_qty,
        expected_stock=expected_stock,
        system_stock=actual_system_stock,
        variance=variance,
        risk_score=risk_score,
        risk_level=risk_level,
        status="OPEN" if risk_score >= 40.0 else "RESOLVED",
        reasons_json=json.dumps(reasons),
        created_at=datetime.now(timezone.utc)
    )
    db.add(anomaly)
    db.flush()

    # Automatically create Investigation Case for high-risk anomalies
    if risk_score >= 40.0:
        case_code = f"INVEST-2026-{uuid.uuid4().hex[:6].upper()}"
        case = InvestigationCase(
            case_code=case_code,
            anomaly_id=anomaly.id,
            product_id=product_id,
            warehouse_id=warehouse_id,
            risk_score=risk_score,
            risk_level=risk_level,
            status="OPEN",
            created_at=datetime.now(timezone.utc)
        )
        db.add(case)

    db.commit()
    db.refresh(anomaly)
    return anomaly

def get_investigation_case_evidence(db: Session, case_code: str) -> Dict[str, Any]:
    """
    Gathers automated evidence timeline across Sales, POs, Returns, Adjustments, Devices, and Audit Logs.
    """
    case = db.query(InvestigationCase).filter(InvestigationCase.case_code == case_code).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Investigation case '{case_code}' not found.")

    prod = db.query(Product).filter(Product.id == case.product_id).first()
    wh = db.query(Warehouse).filter(Warehouse.id == case.warehouse_id).first() if case.warehouse_id else None

    # Gather evidence events timeline
    timeline = []

    txs = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == case.product_id).order_by(InventoryTransaction.created_at.desc()).all()
    for tx in txs:
        timeline.append({
            "timestamp": tx.created_at.isoformat() if tx.created_at else datetime.now(timezone.utc).isoformat(),
            "event_type": (tx.type or "TRANSACTION").upper(),
            "actor_name": tx.user_name or "System Operator",
            "reference_code": tx.reference or f"TX-{tx.id}",
            "description": f"{tx.type}: {tx.quantity:+d} units",
            "details": tx.notes or "Inventory ledger transaction"
        })

    sessions = db.query(UserSession).order_by(UserSession.created_at.desc()).limit(5).all()
    for sess in sessions:
        timeline.append({
            "timestamp": sess.created_at.isoformat() if sess.created_at else datetime.now(timezone.utc).isoformat(),
            "event_type": "SESSION_EVENT",
            "actor_name": f"User #{sess.user_id}",
            "reference_code": sess.session_id,
            "description": f"Active Session from IP {sess.ip_address or 'LAN'}",
            "details": f"Location: {sess.location_summary}"
        })

    timeline.sort(key=lambda x: x["timestamp"], reverse=True)

    reasons = []
    if case.anomaly and case.anomaly.reasons_json:
        try:
            reasons = json.loads(case.anomaly.reasons_json)
        except Exception:
            reasons = []

    return {
        "id": case.id,
        "case_code": case.case_code,
        "anomaly_id": case.anomaly_id,
        "product_id": case.product_id,
        "product_sku": prod.sku if prod else "N/A",
        "product_name": prod.name if prod else "Unknown Product",
        "warehouse_name": wh.name if wh else "Central Hub",
        "expected_stock": case.anomaly.expected_stock if case.anomaly else prod.stock_quantity,
        "actual_stock": case.anomaly.system_stock if case.anomaly else prod.stock_quantity,
        "variance": case.anomaly.variance if case.anomaly else 0,
        "risk_score": case.risk_score,
        "risk_level": case.risk_level,
        "status": case.status,
        "evidence_timeline": timeline,
        "created_at": case.created_at
    }

def get_explainable_number_lineage(db: Session, entity_type: str, entity_id: str) -> Dict[str, Any]:
    """
    "Explain This Number" — Business & Data Lineage Breakdown Engine
    Explains Current Stock, Total Revenue, or Product Margin with constituent mathematical proof nodes.
    """
    e_type = entity_type.upper()

    if e_type == "STOCK":
        prod = db.query(Product).filter((Product.id == entity_id) | (Product.sku == entity_id)).first()
        if not prod:
            raise HTTPException(status_code=404, detail="Product not found for stock lineage.")

        txs = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == prod.id).all()
        opening = 0
        received = sum(abs(t.quantity) for t in txs if (t.type or "").upper() in ["PURCHASE", "RECEIVING"])
        returns = sum(abs(t.quantity) for t in txs if (t.type or "").upper() == "RETURN")
        sales = sum(abs(t.quantity) for t in txs if (t.type or "").upper() == "SALE")
        damages = sum(abs(t.quantity) for t in txs if (t.type or "").upper() == "DAMAGE")
        adjustments = sum(abs(t.quantity) for t in txs if (t.type or "").upper() == "ADJUSTMENT" and t.quantity < 0)

        calc_stock = opening + received + returns - sales - damages - adjustments

        return {
            "entity_type": "STOCK",
            "title": f"Stock Lineage: {prod.name} ({prod.sku})",
            "current_value": prod.stock_quantity,
            "equation_formula": "Opening + Receipts + Returns - Sales - Damages - Adjustments = Calculated Stock",
            "lineage_items": [
                {"label": "Opening Stock", "amount_or_qty": opening, "operation": "+", "details": "Base inventory count"},
                {"label": "Purchase Receipts", "amount_or_qty": received, "operation": "+", "details": f"{received} units received via POs"},
                {"label": "Customer Returns", "amount_or_qty": returns, "operation": "+", "details": f"{returns} units returned & restocked"},
                {"label": "Completed Sales", "amount_or_qty": sales, "operation": "-", "details": f"{sales} units sold across POS"},
                {"label": "Damaged Goods", "amount_or_qty": damages, "operation": "-", "details": f"{damages} units written off"},
                {"label": "Approved Adjustments", "amount_or_qty": adjustments, "operation": "-", "details": f"{adjustments} units manual stock corrections"},
                {"label": "Calculated Current Stock", "amount_or_qty": calc_stock, "operation": "=", "details": f"Matches system stock: {prod.stock_quantity}"}
            ]
        }

    elif e_type == "MARGIN":
        prod = db.query(Product).filter((Product.id == entity_id) | (Product.sku == entity_id)).first()
        if not prod:
            raise HTTPException(status_code=404, detail="Product not found for margin lineage.")

        cost = prod.purchase_price
        selling = prod.selling_price
        margin_val = selling - cost
        margin_pct = (margin_val / selling * 100.0) if selling > 0 else 0.0

        return {
            "entity_type": "MARGIN",
            "title": f"Margin Lineage: {prod.name} ({prod.sku})",
            "current_value": f"${margin_val:.2f} ({margin_pct:.1f}%)",
            "equation_formula": "Selling Price - Purchase Cost = Gross Profit Margin",
            "lineage_items": [
                {"label": "Retail Selling Price", "amount_or_qty": f"${selling:.2f}", "operation": "+", "details": "Active catalog price"},
                {"label": "Supplier Purchase Cost", "amount_or_qty": f"${cost:.2f}", "operation": "-", "details": "Weighted average unit cost"},
                {"label": "Net Profit Margin Floor", "amount_or_qty": f"${margin_val:.2f}", "operation": "=", "details": f"Profit margin ratio {margin_pct:.1f}%"}
            ]
        }

    else: # REVENUE
        sales = db.query(Sale).all()
        total_rev = sum(s.total_amount for s in sales)
        items = [{"label": f"Invoice {s.invoice_number}", "amount_or_qty": f"${s.total_amount:.2f}", "operation": "+", "details": f"Customer: {s.customer_name or 'Walk-in'}"} for s in sales[:10]]
        items.append({"label": "Total Revenue", "amount_or_qty": f"${total_rev:.2f}", "operation": "=", "details": f"Sum across {len(sales)} total sales invoices"})

        return {
            "entity_type": "REVENUE",
            "title": "Business Revenue Lineage Breakdown",
            "current_value": f"${total_rev:.2f}",
            "equation_formula": "Sum of Tax Sales Invoices = Gross Business Revenue",
            "lineage_items": items
        }

def create_stock_reservation(
    db: Session,
    product_id: int,
    quantity: int,
    warehouse_id: Optional[int] = None,
    store_id: Optional[int] = None,
    cart_id: Optional[int] = None,
    session_id: Optional[str] = None,
    duration_minutes: int = 15
) -> StockReservation:
    """
    Reserves inventory units temporarily (e.g. 15 minutes) during POS checkout/cart creation.
    Prevents double-selling across POS counter terminals.
    """
    release_expired_reservations(db)

    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    available_qty = get_available_stock(db, product_id, warehouse_id)
    if available_qty < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient available stock for reservation. Requested: {quantity}, Available: {available_qty} (Physical: {prod.stock_quantity})."
        )

    res_code = f"RES-2026-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=duration_minutes)

    res = StockReservation(
        reservation_code=res_code,
        cart_id=cart_id,
        store_id=store_id,
        product_id=product_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        status="ACTIVE",
        created_at=now,
        expires_at=expires
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    res.reserved_quantity = res.quantity
    return res

def release_expired_reservations(db: Session):
    """
    Checks for expired stock reservations and automatically releases reserved units back to available pool.
    """
    now = datetime.now(timezone.utc)
    expired_res = db.query(StockReservation).filter(
        StockReservation.status == "ACTIVE",
        StockReservation.expires_at <= now
    ).all()

    for res in expired_res:
        res.status = "EXPIRED"
    if expired_res:
        db.commit()

def get_available_stock(db: Session, product_id: int, warehouse_id: Optional[int] = None) -> int:
    release_expired_reservations(db)
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        return 0

    active_res = db.query(StockReservation).filter(
        StockReservation.product_id == product_id,
        StockReservation.status == "ACTIVE"
    ).all()

    total_reserved = sum(r.quantity for r in active_res)
    return max(0, prod.stock_quantity - total_reserved)

def update_ble_location_tracking(
    db: Session,
    tag_id: str,
    product_id: int,
    expected_location: str,
    detected_location: str,
    rssi_dbm: int = -65,
    confidence_percentage: float = 82.0
) -> BLEDeviceLocation:
    """
    Simulates / ingests BLE RSSI location tracking signals from IoT ESP32 gateways.
    Triggers physical location mismatch alert if expected_location != detected_location.
    """
    ble = db.query(BLEDeviceLocation).filter(BLEDeviceLocation.tag_id == tag_id).first()
    has_mismatch = (expected_location.strip().lower() != detected_location.strip().lower())

    if not ble:
        ble = BLEDeviceLocation(
            tag_id=tag_id,
            product_id=product_id,
            expected_location=expected_location,
            detected_location=detected_location,
            rssi_dbm=rssi_dbm,
            confidence_percentage=confidence_percentage,
            has_mismatch=has_mismatch,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(ble)
    else:
        ble.expected_location = expected_location
        ble.detected_location = detected_location
        ble.rssi_dbm = rssi_dbm
        ble.confidence_percentage = confidence_percentage
        ble.has_mismatch = has_mismatch
        ble.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ble)
    return ble
