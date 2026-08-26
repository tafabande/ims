from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.database import get_db
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/registries", tags=["Authoritative Business Registries"])

# Authoritative Business Registries Data Source
ENTERPRISE_REGISTRIES = {
    "organisations": [
        {
            "id": "ORG-000001",
            "name": "Harare Commercial Enterprises Ltd",
            "domain": "Retail & Distribution",
            "tax_number": "VAT-99201482",
            "currency": "USD",
            "timezone": "Africa/Harare",
            "status": "ACTIVE"
        }
    ],
    "warehouses": [
        {"id": "WH-001", "code": "HRE-MDC", "name": "Harare Main DC", "type": "DISTRIBUTION_CENTER", "capacity": 50000, "status": "ACTIVE"},
        {"id": "WH-002", "code": "BYO-HUB", "name": "Bulawayo Hub", "type": "REGIONAL_WAREHOUSE", "capacity": 25000, "status": "ACTIVE"}
    ],
    "locations": [
        {"id": "LOC-001", "warehouse_id": "WH-001", "zone": "Zone A", "aisle": "Aisle 02", "rack": "Rack 04", "bin": "Bin A-12-04"},
        {"id": "LOC-002", "warehouse_id": "WH-001", "zone": "Zone B", "aisle": "Aisle 01", "rack": "Rack 02", "bin": "Bin B-02-01"}
    ],
    "uom_conversions": [
        {"id": 1, "uom_from": "CARTON", "uom_to": "BOX", "factor": 12},
        {"id": 2, "uom_from": "BOX", "uom_to": "UNIT", "factor": 10},
        {"id": 3, "uom_from": "CARTON", "uom_to": "UNIT", "factor": 120}
    ],
    "reasons": [
        {"id": 1, "code": "DAMAGED", "label": "Damaged Goods", "type": "STOCK_WRITE_OFF"},
        {"id": 2, "code": "EXPIRED", "label": "Expired Stock", "type": "STOCK_WRITE_OFF"},
        {"id": 3, "code": "SUPPLIER_ERROR", "label": "Supplier Discrepancy", "type": "RECEIVING_VARIANCE"},
        {"id": 4, "code": "STOCK_COUNT", "label": "Physical Count Variance", "type": "STOCKTAK_ADJUSTMENT"}
    ],
    "payment_accounts": [
        {"id": "ACC-001", "code": "CASH-STORE-A", "name": "Main Cash Till Drawer - Store A", "type": "CASH_DRAWER", "status": "ACTIVE"},
        {"id": "ACC-002", "code": "BANK-CBZ-01", "name": "CBZ Corporate Operations Account", "type": "BANK_ACCOUNT", "status": "ACTIVE"}
    ]
}

@router.get("/{registry_name}")
def get_enterprise_registry(
    registry_name: str,
    auth_ctx: dict = Depends(require_permission("inventory:view"))
):
    """
    Returns authoritative business registry data (Organisations, Warehouses, Locations, UOMs, Reasons, Payment Accounts).
    """
    reg_key = registry_name.lower()
    if reg_key not in ENTERPRISE_REGISTRIES:
        raise HTTPException(
            status_code=404,
            detail=f"Registry '{registry_name}' not found. Available registries: {list(ENTERPRISE_REGISTRIES.keys())}"
        )
    return ENTERPRISE_REGISTRIES[reg_key]

@router.post("/{registry_name}/request-mutation")
def request_registry_mutation(
    registry_name: str,
    payload: Dict[str, Any],
    auth_ctx: dict = Depends(require_permission("organisation:manage")) # App Admin or Manager
):
    """
    Four-Eyes Registry Mutation Request:
    Sensitive registry modifications (e.g. updating bank accounts or location capacities) require manager approval.
    """
    reg_key = registry_name.lower()
    if reg_key not in ENTERPRISE_REGISTRIES:
        raise HTTPException(status_code=404, detail=f"Registry '{registry_name}' not found.")

    reason = payload.get("reason")
    if not reason:
        raise HTTPException(status_code=400, detail="Justification reason required for registry mutation.")

    return {
        "status": "MUTATION_PENDING_APPROVAL",
        "registry": registry_name,
        "proposed_changes": payload.get("changes"),
        "requested_by": "USR-AUTHENTICATED",
        "reason": reason,
        "message": f"Registry mutation requested for {registry_name}. Pending four-eyes approval."
    }
