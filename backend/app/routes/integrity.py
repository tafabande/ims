from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BLEDeviceLocation, InventoryAnomaly, Product
from app.schemas import (
    InventoryAnomalyResponse,
    InvestigationCaseResponse,
    LineageExplanationResponse,
    StockReservationRequest,
    StockReservationResponse,
)
from app.services import integrity_service
from app.services.iam_service import require_permission

router = APIRouter(
    prefix="/api/integrity",
    tags=["Inventory Integrity & Operational Intelligence Engine"],
)


@router.post("/evaluate/{product_id}", response_model=InventoryAnomalyResponse)
def evaluate_product_integrity(
    product_id: int,
    warehouse_id: int | None = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:adjust")),
):
    """
    Evaluates the continuous Inventory Integrity Equation:
    Opening + Receipts + Returns - Sales - Damages - Adjustments = Expected Stock.
    Calculates Inventory Risk Score (0-100) and triggers investigation cases for anomalies.
    """
    return integrity_service.evaluate_inventory_integrity(db, product_id, warehouse_id)


@router.get("/anomalies", response_model=list[InventoryAnomalyResponse])
def list_inventory_anomalies(
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    List active inventory integrity anomaly alerts and risk scores.
    """
    anomalies = db.query(InventoryAnomaly).order_by(InventoryAnomaly.created_at.desc()).all()
    res = []
    for a in anomalies:
        prod = db.query(Product).filter(Product.id == a.product_id).first()
        res.append(
            {
                "id": a.id,
                "anomaly_code": a.anomaly_code,
                "product_id": a.product_id,
                "product_sku": prod.sku if prod else None,
                "product_name": prod.name if prod else None,
                "warehouse_id": a.warehouse_id,
                "opening_stock": a.opening_stock,
                "received_qty": a.received_qty,
                "returns_qty": a.returns_qty,
                "sales_qty": a.sales_qty,
                "damage_qty": a.damage_qty,
                "adjustments_qty": a.adjustments_qty,
                "expected_stock": a.expected_stock,
                "system_stock": a.system_stock,
                "variance": a.variance,
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "status": a.status,
                "reasons": [],
                "created_at": a.created_at,
            }
        )
    return res


@router.get("/investigations/{case_code}", response_model=InvestigationCaseResponse)
def get_investigation_case(
    case_code: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    Gathers automated evidence timeline for an investigation case across sales, POs, returns, adjustments, devices, and audit logs.
    """
    return integrity_service.get_investigation_case_evidence(db, case_code)


@router.get("/explain/{entity_type}/{entity_id}", response_model=LineageExplanationResponse)
def explain_number_lineage(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    "Explain This Number" — Business & Data Lineage Breakdown Engine.
    Explains Current Stock, Total Revenue, or Product Margin with constituent mathematical proof nodes.
    """
    return integrity_service.get_explainable_number_lineage(db, entity_type, entity_id)


@router.post("/reservations", response_model=StockReservationResponse)
def create_stock_reservation(
    req: StockReservationRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("sales:create")),
):
    """
    Creates a temporary digital stock reservation (e.g. 15 mins) during POS checkout.
    Prevents double-selling across POS terminals.
    """
    return integrity_service.create_stock_reservation(
        db=db,
        product_id=req.product_id,
        quantity=req.quantity,
        warehouse_id=req.warehouse_id,
        duration_minutes=req.duration_minutes,
    )


@router.get("/digital-twin")
def get_digital_twin_spatial_map(
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    Returns the Operational Digital Twin spatial map layout of the warehouse along with active BLE location tracking signals.
    """
    ble_devices = db.query(BLEDeviceLocation).all()
    nodes = []
    for b in ble_devices:
        prod = db.query(Product).filter(Product.id == b.product_id).first()
        nodes.append(
            {
                "id": b.id,
                "tag_id": b.tag_id,
                "product_id": b.product_id,
                "product_sku": prod.sku if prod else "N/A",
                "product_name": prod.name if prod else "Unknown",
                "expected_location": b.expected_location,
                "detected_location": b.detected_location,
                "rssi_dbm": b.rssi_dbm,
                "confidence_percentage": b.confidence_percentage,
                "has_mismatch": b.has_mismatch,
                "updated_at": b.updated_at.isoformat() if b.updated_at else None,
            }
        )

    layout = {
        "warehouse_name": "Harare Main Warehouse",
        "zones": [
            {
                "code": "AISLE-A",
                "name": "Aisle A - High Velocity Laptops",
                "shelves": ["Shelf A1", "Shelf A2", "Shelf A3"],
            },
            {
                "code": "AISLE-B",
                "name": "Aisle B - Peripherals & Accessories",
                "shelves": ["Shelf B1", "Shelf B2", "Shelf B3"],
            },
            {
                "code": "RECEIVING-BAY",
                "name": "Receiving & Quality Quarantine",
                "shelves": ["Quarantine Bay 01", "Quarantine Bay 02"],
            },
        ],
        "ble_tracking_nodes": nodes,
    }
    return layout
