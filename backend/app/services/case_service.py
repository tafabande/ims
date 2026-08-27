"""
Unified Operational Case & Escalation Workflow Engine Service
Implements a single reusable escalation framework for all operational exceptions:
- REFUND_REQUEST
- RECEIVING_DISCREPANCY
- FLOAT_VARIANCE
- STOCK_ADJUSTMENT
- SYSTEM_ERROR / INCIDENT
- PRICE_OVERRIDE

State Machine:
DRAFT -> SUBMITTED -> PENDING_REVIEW -> [ APPROVED | DENIED | CONTESTED | RETURNED | ESCALATED ] -> EXECUTED

Rules:
1. Never overwrite the original request.
2. Log every decision & status change immutably into `case_events` with timestamps and reviewer notes.
3. Keep business objects separate; Case references entity_type and entity_id.
"""

from datetime import UTC, datetime
from typing import Any


class UnifiedCaseService:
    def __init__(self):
        # In-memory initial seed cases for demonstration / fallback
        self.cases = [
            {
                "id": 1,
                "case_number": "REF-2026-0042",
                "case_type": "REFUND_REQUEST",
                "status": "PENDING_REVIEW",
                "priority": "HIGH",
                "subject": "Customer Refund Request: #REF-00042 ($340.00)",
                "description": "Customer ABC Traders requested $340.00 refund on receipt SAL-00182 due to packaging damage upon unboxing.",
                "created_by": "Tendai M. (EMP-00014)",
                "assigned_to_role": "MANAGER",
                "entity_type": "REFUND",
                "entity_id": "INV-004281",
                "amount": 340.00,
                "evidence_metadata": {
                    "receipt_id": "SAL-00182",
                    "original_sale_amount": 340.00,
                    "item_name": "Dell XPS 15 Workstation Laptop",
                    "evidence_files": ["Receipt_SAL00182.pdf", "Photo_DamagedBox.jpg"],
                },
                "created_at": "2026-08-26T10:42:00Z",
                "updated_at": "2026-08-26T10:42:00Z",
                "events": [
                    {
                        "id": 101,
                        "event_type": "CREATED",
                        "performed_by": "Tendai M. (EMP-00014)",
                        "old_status": None,
                        "new_status": "DRAFT",
                        "comment": "Refund request draft created",
                        "created_at": "2026-08-26T10:42:00Z",
                    },
                    {
                        "id": 102,
                        "event_type": "SUBMITTED",
                        "performed_by": "Tendai M. (EMP-00014)",
                        "old_status": "DRAFT",
                        "new_status": "PENDING_REVIEW",
                        "comment": "Submitted for Store Manager approval",
                        "created_at": "2026-08-26T10:43:00Z",
                    },
                ],
            },
            {
                "id": 2,
                "case_number": "DISC-2026-0087",
                "case_type": "RECEIVING_DISCREPANCY",
                "status": "PENDING_REVIEW",
                "priority": "HIGH",
                "subject": "Goods Receiving Discrepancy: PO-00431 (-2u Missing)",
                "description": "XYZ Electronics delivery PO-00431: 100 ordered, 96 accepted, 2 rejected, 2 unaccounted.",
                "created_by": "Farai W. (EMP-00031)",
                "assigned_to_role": "MANAGER",
                "entity_type": "PURCHASE_ORDER",
                "entity_id": "PO-00431",
                "amount": 230.00,
                "evidence_metadata": {
                    "po_number": "PO-00431",
                    "supplier": "XYZ Electronics",
                    "ordered_qty": 100,
                    "accepted_qty": 96,
                    "rejected_qty": 2,
                    "missing_qty": 2,
                },
                "created_at": "2026-08-26T09:15:00Z",
                "updated_at": "2026-08-26T09:15:00Z",
                "events": [
                    {
                        "id": 103,
                        "event_type": "SUBMITTED",
                        "performed_by": "Farai W. (EMP-00031)",
                        "old_status": None,
                        "new_status": "PENDING_REVIEW",
                        "comment": "Discrepancy calculated upon receiving count",
                        "created_at": "2026-08-26T09:15:00Z",
                    }
                ],
            },
            {
                "id": 3,
                "case_number": "FV-2026-0021",
                "case_type": "FLOAT_VARIANCE",
                "status": "PENDING_REVIEW",
                "priority": "NORMAL",
                "subject": "End-of-Shift Cash Float Variance: -$13.00",
                "description": "Till 01 Close: Expected $200.00, Actual Counted $187.00. Variance -$13.00.",
                "created_by": "Tendai M. (EMP-00014)",
                "assigned_to_role": "MANAGER",
                "entity_type": "CASH_SESSION",
                "entity_id": "SES-00021",
                "amount": 13.00,
                "evidence_metadata": {
                    "till_id": "TILL-01",
                    "expected_cash": 200.00,
                    "actual_cash": 187.00,
                    "variance": -13.00,
                    "staff_reason": "Incorrect opening change float provided at shift start.",
                },
                "created_at": "2026-08-26T08:30:00Z",
                "updated_at": "2026-08-26T08:30:00Z",
                "events": [
                    {
                        "id": 104,
                        "event_type": "SUBMITTED",
                        "performed_by": "Tendai M. (EMP-00014)",
                        "old_status": None,
                        "new_status": "PENDING_REVIEW",
                        "comment": "Shift close float variance submitted",
                        "created_at": "2026-08-26T08:30:00Z",
                    }
                ],
            },
            {
                "id": 4,
                "case_number": "INC-2026-0017",
                "case_type": "SYSTEM_ERROR",
                "status": "UNDER_INVESTIGATION",
                "priority": "HIGH",
                "subject": "POS Stock Deduction Transaction Failure: INV-00921",
                "description": "Customer payment succeeded on EFTPOS card reader but stock deduction failed due to database timeout.",
                "created_by": "Charlie Staff (EMP-00014)",
                "assigned_to_role": "SYSADMIN",
                "entity_type": "SYSTEM_INCIDENT",
                "entity_id": "INV-00921",
                "amount": 0.00,
                "evidence_metadata": {
                    "transaction_id": "TXN-902184",
                    "error_code": "DB_TIMEOUT_LOCK",
                    "affected_sku": "SKU-000482",
                },
                "created_at": "2026-08-26T07:10:00Z",
                "updated_at": "2026-08-26T07:10:00Z",
                "events": [
                    {
                        "id": 105,
                        "event_type": "SUBMITTED",
                        "performed_by": "Charlie Staff",
                        "old_status": None,
                        "new_status": "PENDING_REVIEW",
                        "comment": "Incident reported from front-desk POS",
                        "created_at": "2026-08-26T07:10:00Z",
                    },
                    {
                        "id": 106,
                        "event_type": "ESCALATED",
                        "performed_by": "Bob Manager",
                        "old_status": "PENDING_REVIEW",
                        "new_status": "UNDER_INVESTIGATION",
                        "comment": "Escalated to IT Sysadmin for database ledger audit",
                        "created_at": "2026-08-26T07:30:00Z",
                    },
                ],
            },
        ]

    def create_case(self, data: dict[str, Any]) -> dict[str, Any]:
        case_id = len(self.cases) + 1
        prefix_map = {
            "REFUND_REQUEST": "REF",
            "RECEIVING_DISCREPANCY": "DISC",
            "FLOAT_VARIANCE": "FV",
            "STOCK_ADJUSTMENT": "ADJ",
            "SYSTEM_ERROR": "INC",
            "PRICE_OVERRIDE": "OVR",
        }
        prefix = prefix_map.get(data.get("case_type"), "CAS")
        case_num = f"{prefix}-2026-{Math_floor_rand(case_id)}"

        now = datetime.now(UTC).isoformat()

        new_case = {
            "id": case_id,
            "case_number": case_num,
            "case_type": data.get("case_type", "OTHER"),
            "status": "PENDING_REVIEW",
            "priority": data.get("priority", "NORMAL"),
            "subject": data.get("subject", "Operational Case"),
            "description": data.get("description", ""),
            "created_by": data.get("created_by", "Staff Member"),
            "assigned_to_role": data.get("assigned_to_role", "MANAGER"),
            "entity_type": data.get("entity_type"),
            "entity_id": data.get("entity_id"),
            "amount": data.get("amount", 0.0),
            "evidence_metadata": data.get("evidence_metadata", {}),
            "created_at": now,
            "updated_at": now,
            "events": [
                {
                    "id": Date_now_id(),
                    "event_type": "SUBMITTED",
                    "performed_by": data.get("created_by", "Staff Member"),
                    "old_status": "DRAFT",
                    "new_status": "PENDING_REVIEW",
                    "comment": data.get("submission_comment", "Case submitted for review"),
                    "created_at": now,
                }
            ],
        }
        self.cases.insert(0, new_case)
        return new_case

    def list_cases(self, status_filter: str | None = None, type_filter: str | None = None) -> list[dict[str, Any]]:
        result = self.cases
        if status_filter:
            result = [c for c in result if c["status"] == status_filter.upper()]
        if type_filter:
            result = [c for c in result if c["case_type"] == type_filter.upper()]
        return result

    def get_case_by_number(self, case_number: str) -> dict[str, Any] | None:
        for c in self.cases:
            if c["case_number"] == case_number or str(c["id"]) == case_number:
                return c
        return None

    def execute_decision(self, case_number: str, decision: str, reviewer: str, comment: str) -> dict[str, Any]:
        case = self.get_case_by_number(case_number)
        if not case:
            return {"status": "ERROR", "message": f"Case {case_number} not found."}

        old_status = case["status"]
        valid_decisions = [
            "APPROVED",
            "DENIED",
            "CONTESTED",
            "RETURNED",
            "ESCALATED",
            "EXECUTED",
        ]
        decision_upper = decision.upper()

        if decision_upper not in valid_decisions:
            return {
                "status": "ERROR",
                "message": f"Invalid decision '{decision}'. Must be one of {valid_decisions}.",
            }

        now = datetime.now(UTC).isoformat()
        new_status = decision_upper if decision_upper != "APPROVED" else "APPROVED"

        # Update case
        case["status"] = new_status
        case["updated_at"] = now

        if new_status in ["APPROVED", "DENIED", "EXECUTED"]:
            case["resolved_at"] = now

        # Append to immutable events history
        event_entry = {
            "id": Date_now_id(),
            "event_type": decision_upper,
            "performed_by": reviewer,
            "old_status": old_status,
            "new_status": new_status,
            "comment": comment,
            "created_at": now,
        }
        case["events"].append(event_entry)

        return {
            "status": "SUCCESS",
            "case_number": case["case_number"],
            "decision": decision_upper,
            "new_status": new_status,
            "reviewer": reviewer,
            "comment": comment,
            "executed_at": now,
            "message": f"Decision '{decision_upper}' recorded in immutable timeline for case {case['case_number']}.",
        }


def Math_floor_rand(id_num):
    return f"{1000 + id_num:04d}"


def Date_now_id():
    import time

    return int(time.time() * 1000)


case_service = UnifiedCaseService()
