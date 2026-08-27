import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    InventoryTransaction,
    Product,
    ReconciliationException,
    SaleItem,
)


def run_inventory_reconciliation_scan(
    db: Session, store_id: int | None = None, warehouse_id: int | None = None
) -> list[ReconciliationException]:
    """
    Automated Background Reconciliation Worker:
    Continuously compares Opening Stock + Ledger Adjustments - Sales vs Recorded Stock.
    Generates Inventory Exceptions (EXC-2026-XXXX) for any detected variances.
    """
    products = db.query(Product).all()
    exceptions = []

    for p in products:
        # Calculate net inventory ledger delta
        total_ledger_qty = (
            db.query(func.sum(InventoryTransaction.quantity)).filter(InventoryTransaction.product_id == p.id).scalar()
            or 0
        )

        # Recorded current stock in Product table
        actual_stock = p.stock_quantity
        expected_stock = total_ledger_qty

        variance = expected_stock - actual_stock

        if variance != 0:
            exc_code = f"EXC-2026-{uuid.uuid4().hex[:6].upper()}"
            severity = "CRITICAL" if abs(variance) > 50 else "HIGH" if abs(variance) > 10 else "MEDIUM"

            # Check if open exception already exists for product
            existing = (
                db.query(ReconciliationException)
                .filter(
                    ReconciliationException.product_id == p.id,
                    ReconciliationException.status.in_(["DETECTED", "OPEN", "UNDER_REVIEW"]),
                )
                .first()
            )

            if not existing:
                exc = ReconciliationException(
                    exception_code=exc_code,
                    exception_type="STOCK_VARIANCE",
                    store_id=store_id,
                    warehouse_id=warehouse_id,
                    product_id=p.id,
                    expected_stock=expected_stock,
                    actual_stock=actual_stock,
                    variance=variance,
                    severity=severity,
                    status="OPEN",
                    investigation_notes=f"Automated Reconciliation Scan: Expected {expected_stock} units from transaction ledger, but actual stock recorded is {actual_stock}. Discrepancy: {variance} units.",
                    created_at=datetime.now(UTC),
                )
                db.add(exc)
                exceptions.append(exc)

    db.commit()
    return exceptions


def detect_sales_inventory_anomalies(db: Session) -> list[ReconciliationException]:
    """
    Sales vs Inventory Anomaly Detection Worker:
    Flags instances where sales invoices recorded do not match physical inventory reduction.
    """
    products = db.query(Product).all()
    anomalies = []

    for p in products:
        # Total units sold according to Sales Invoices
        total_sold_units = db.query(func.sum(SaleItem.quantity)).filter(SaleItem.product_id == p.id).scalar() or 0

        # Total units depleted according to Inventory Ledger SALE transactions
        total_ledger_depletion = abs(
            db.query(func.sum(InventoryTransaction.quantity))
            .filter(
                InventoryTransaction.product_id == p.id,
                InventoryTransaction.type.in_(["SALE", "OUT"]),
            )
            .scalar()
            or 0
        )

        anomaly_variance = total_sold_units - total_ledger_depletion

        if anomaly_variance > 0:
            exc_code = f"EXC-2026-ANOM-{uuid.uuid4().hex[:4].upper()}"
            existing = (
                db.query(ReconciliationException)
                .filter(
                    ReconciliationException.product_id == p.id,
                    ReconciliationException.exception_type == "SALES_INVENTORY_ANOMALY",
                    ReconciliationException.status.in_(["DETECTED", "OPEN", "UNDER_REVIEW"]),
                )
                .first()
            )

            if not existing:
                exc = ReconciliationException(
                    exception_code=exc_code,
                    exception_type="SALES_INVENTORY_ANOMALY",
                    product_id=p.id,
                    expected_stock=total_sold_units,
                    actual_stock=total_ledger_depletion,
                    variance=anomaly_variance,
                    severity="CRITICAL",
                    status="OPEN",
                    investigation_notes=f"Sales/Inventory Anomaly Detected: {total_sold_units} units recorded on sales invoices, but only {total_ledger_depletion} units were depleted from inventory ledger. Discrepancy: {anomaly_variance} units.",
                    created_at=datetime.now(UTC),
                )
                db.add(exc)
                anomalies.append(exc)

    db.commit()
    return anomalies


def resolve_exception(
    db: Session, exception_id: int, resolution_type: str, investigation_notes: str
) -> ReconciliationException:
    """
    Resolve inventory exception with mandatory investigation audit trail.
    """
    exc = db.query(ReconciliationException).filter(ReconciliationException.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Reconciliation exception not found.")

    exc.status = "RESOLVED"
    exc.resolution_type = resolution_type
    exc.investigation_notes = f"{exc.investigation_notes or ''}\n[RESOLVED - {resolution_type}]: {investigation_notes}"
    exc.resolved_at = datetime.now(UTC)
    db.commit()
    db.refresh(exc)
    return exc


def list_reconciliation_exceptions(db: Session, status_filter: str | None = None) -> list[ReconciliationException]:
    query = db.query(ReconciliationException)
    if status_filter:
        query = query.filter(ReconciliationException.status == status_filter)
    return query.order_by(ReconciliationException.created_at.desc()).all()
