from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.services.case_service import case_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/cases", tags=["Unified Operational Case & Escalation Workflow Engine"])


@router.get("")
def list_operational_cases(
    status_filter: str | None = None,
    type_filter: str | None = None,
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    List operational cases (REFUND_REQUEST, RECEIVING_DISCREPANCY, FLOAT_VARIANCE, STOCK_ADJUSTMENT, SYSTEM_ERROR, PRICE_OVERRIDE).
    """
    return case_service.list_cases(status_filter=status_filter, type_filter=type_filter)


@router.get("/{case_number}")
def get_case_details_and_timeline(case_number: str, auth_ctx: dict = Depends(require_permission("inventory:view"))):
    """
    Get full case details, evidence metadata, and immutable timeline audit events.
    """
    c = case_service.get_case_by_number(case_number)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case {case_number} not found.")
    return c


@router.post("")
def create_operational_case(payload: dict[str, Any], auth_ctx: dict = Depends(require_permission("sales:view"))):
    """
    Create a new Operational Case for managerial review and decision.
    """
    return case_service.create_case(payload)


@router.post("/{case_number}/decision")
def execute_case_decision(
    case_number: str,
    payload: dict[str, Any],
    auth_ctx: dict = Depends(require_permission("attention:decide")),  # Managerial capability
):
    """
    Execute a decision on a case (APPROVED, DENIED, CONTESTED, RETURNED, ESCALATED).
    Appends an immutable event log entry with reviewer notes. Never overwrites original request.
    """
    decision = payload.get("decision", "").upper()
    comment = payload.get("comment", "").strip()
    reviewer = payload.get("reviewer", "Manager User")

    if decision in ["DENIED", "CONTESTED", "RETURNED", "ESCALATED"] and not comment:
        raise HTTPException(
            status_code=400,
            detail=f"Reviewer notes are mandatory when decision is '{decision}'.",
        )

    res = case_service.execute_decision(case_number, decision, reviewer, comment)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res
