"""
Unified Operational Case & Escalation Workflow Engine Service
Persists all operational cases, state transitions, and evidence immutably into PostgreSQL database.

Models used:
- OperationalCase ('cases' table)
- CaseEvent ('case_events' table)
- CaseAttachment ('case_attachments' table)

State Machine:
DRAFT -> SUBMITTED -> PENDING_REVIEW -> [ APPROVED | DENIED | CONTESTED | RETURNED | ESCALATED ] -> EXECUTED
"""

from datetime import UTC, datetime
import json
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import CaseEvent, OperationalCase


class UnifiedCaseService:
    def _get_session(self, db: Session | None = None) -> tuple[Session, bool]:
        if db is not None:
            return db, False
        return SessionLocal(), True

    def _ensure_initial_seed_cases(self, db: Session):
        """Seed initial baseline cases if table is empty"""
        count = db.query(OperationalCase).count()
        if count > 0:
            return

        seed_data = [
            {
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
                "evidence_metadata": json.dumps({
                    "receipt_id": "SAL-00182",
                    "original_sale_amount": 340.00,
                    "item_name": "Dell XPS 15 Workstation Laptop",
                    "evidence_files": ["Receipt_SAL00182.pdf", "Photo_DamagedBox.jpg"],
                }),
                "events": [
                    {
                        "event_type": "CREATED",
                        "performed_by": "Tendai M. (EMP-00014)",
                        "old_status": None,
                        "new_status": "DRAFT",
                        "comment": "Refund request draft created",
                    },
                    {
                        "event_type": "SUBMITTED",
                        "performed_by": "Tendai M. (EMP-00014)",
                        "old_status": "DRAFT",
                        "new_status": "PENDING_REVIEW",
                        "comment": "Submitted for Store Manager approval",
                    },
                ],
            },
            {
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
                "evidence_metadata": json.dumps({
                    "po_number": "PO-00431",
                    "supplier": "XYZ Electronics",
                    "ordered_qty": 100,
                    "accepted_qty": 96,
                    "rejected_qty": 2,
                    "missing_qty": 2,
                }),
                "events": [
                    {
                        "event_type": "SUBMITTED",
                        "performed_by": "Farai W. (EMP-00031)",
                        "old_status": None,
                        "new_status": "PENDING_REVIEW",
                        "comment": "Discrepancy calculated upon receiving count",
                    }
                ],
            },
            {
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
                "evidence_metadata": json.dumps({
                    "till_id": "TILL-01",
                    "expected_cash": 200.00,
                    "actual_cash": 187.00,
                    "variance": -13.00,
                    "staff_reason": "Incorrect opening change float provided at shift start.",
                }),
                "events": [
                    {
                        "event_type": "SUBMITTED",
                        "performed_by": "Tendai M. (EMP-00014)",
                        "old_status": None,
                        "new_status": "PENDING_REVIEW",
                        "comment": "Shift close float variance submitted",
                    }
                ],
            },
            {
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
                "evidence_metadata": json.dumps({
                    "transaction_id": "TXN-902184",
                    "error_code": "DB_TIMEOUT_LOCK",
                    "affected_sku": "SKU-000482",
                }),
                "events": [
                    {
                        "event_type": "SUBMITTED",
                        "performed_by": "Charlie Staff",
                        "old_status": None,
                        "new_status": "PENDING_REVIEW",
                        "comment": "Incident reported from front-desk POS",
                    },
                    {
                        "event_type": "ESCALATED",
                        "performed_by": "Bob Manager",
                        "old_status": "PENDING_REVIEW",
                        "new_status": "UNDER_INVESTIGATION",
                        "comment": "Escalated to IT Sysadmin for database ledger audit",
                    },
                ],
            },
        ]

        for s in seed_data:
            events_data = s.pop("events")
            case_obj = OperationalCase(**s, created_at=datetime.now(UTC), updated_at=datetime.now(UTC))
            db.add(case_obj)
            db.flush()

            for ev in events_data:
                e_obj = CaseEvent(
                    case_id=case_obj.id,
                    event_type=ev["event_type"],
                    performed_by=ev["performed_by"],
                    old_status=ev["old_status"],
                    new_status=ev["new_status"],
                    comment=ev["comment"],
                    created_at=datetime.now(UTC),
                )
                db.add(e_obj)

        db.commit()

    def _case_to_dict(self, case: OperationalCase) -> dict[str, Any]:
        evidence = {}
        if case.evidence_metadata:
            try:
                evidence = json.loads(case.evidence_metadata)
            except Exception:
                evidence = {"raw": case.evidence_metadata}

        events_list = []
        if case.events:
            sorted_events = sorted(case.events, key=lambda x: x.id)
            for ev in sorted_events:
                meta = {}
                if ev.metadata_json:
                    try:
                        meta = json.loads(ev.metadata_json)
                    except Exception:
                        meta = {}
                events_list.append({
                    "id": ev.id,
                    "event_type": ev.event_type,
                    "performed_by": ev.performed_by,
                    "old_status": ev.old_status,
                    "new_status": ev.new_status,
                    "comment": ev.comment,
                    "metadata": meta,
                    "created_at": ev.created_at.isoformat() if ev.created_at else None,
                })

        res = {
            "id": case.id,
            "case_number": case.case_number,
            "case_type": case.case_type,
            "status": case.status,
            "priority": case.priority,
            "subject": case.subject,
            "description": case.description or "",
            "created_by": case.created_by,
            "assigned_to_role": case.assigned_to_role,
            "entity_type": case.entity_type,
            "entity_id": case.entity_id,
            "amount": case.amount or 0.0,
            "evidence_metadata": evidence,
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "updated_at": case.updated_at.isoformat() if case.updated_at else None,
            "events": events_list,
        }
        if case.resolved_at:
            res["resolved_at"] = case.resolved_at.isoformat()
        return res

    def create_case(self, data: dict[str, Any], db: Session | None = None) -> dict[str, Any]:
        session, close_on_exit = self._get_session(db)
        try:
            prefix_map = {
                "REFUND_APPROVAL": "REF",
                "REFUND_REQUEST": "REF",
                "RECEIVING_DISCREPANCY": "DISC",
                "FLOAT_VARIANCE": "FV",
                "CASH_VARIANCE": "FV",
                "STOCK_ADJUSTMENT": "ADJ",
                "SYSTEM_ERROR": "INC",
                "PRICE_OVERRIDE": "OVR",
                "STOCK_TRANSFER_EXCEPTION": "TRX",
                "DAMAGED_GOODS": "DMG",
                "MISSING_STOCK": "MIS",
                "FAILED_TRANSACTION": "FLT",
                "WORK_SESSION_EXCEPTION": "WSX",
            }
            prefix = prefix_map.get(data.get("case_type"), "CAS")
            short_rand = uuid.uuid4().hex[:6].upper()
            case_num = f"{prefix}-2026-{short_rand}"

            evidence = data.get("evidence_metadata", {})
            evidence_str = json.dumps(evidence) if isinstance(evidence, (dict, list)) else str(evidence or "")

            now = datetime.now(UTC)
            case_obj = OperationalCase(
                case_number=case_num,
                case_type=data.get("case_type", "OTHER"),
                status="PENDING_REVIEW",
                priority=data.get("priority", "NORMAL"),
                subject=data.get("subject", "Operational Case"),
                description=data.get("description", ""),
                created_by=data.get("created_by", "Staff Member"),
                assigned_to_role=data.get("assigned_to_role", "MANAGER"),
                entity_type=data.get("entity_type"),
                entity_id=str(data.get("entity_id")) if data.get("entity_id") is not None else None,
                amount=float(data.get("amount", 0.0)),
                evidence_metadata=evidence_str,
                created_at=now,
                updated_at=now,
            )
            session.add(case_obj)
            session.flush()

            init_event = CaseEvent(
                case_id=case_obj.id,
                event_type="SUBMITTED",
                performed_by=data.get("created_by", "Staff Member"),
                old_status="DRAFT",
                new_status="PENDING_REVIEW",
                comment=data.get("submission_comment", "Case submitted for review"),
                created_at=now,
            )
            session.add(init_event)
            session.commit()
            session.refresh(case_obj)

            return self._case_to_dict(case_obj)
        except Exception:
            session.rollback()
            raise
        finally:
            if close_on_exit:
                session.close()

    def list_cases(
        self,
        status_filter: str | None = None,
        type_filter: str | None = None,
        db: Session | None = None,
    ) -> list[dict[str, Any]]:
        session, close_on_exit = self._get_session(db)
        try:
            self._ensure_initial_seed_cases(session)
            query = session.query(OperationalCase)
            if status_filter:
                query = query.filter(OperationalCase.status == status_filter.upper())
            if type_filter:
                query = query.filter(OperationalCase.case_type == type_filter.upper())

            cases = query.order_by(OperationalCase.created_at.desc()).all()
            return [self._case_to_dict(c) for c in cases]
        finally:
            if close_on_exit:
                session.close()

    def get_case_by_number(self, case_number: str, db: Session | None = None) -> dict[str, Any] | None:
        session, close_on_exit = self._get_session(db)
        try:
            self._ensure_initial_seed_cases(session)
            case_obj = session.query(OperationalCase).filter(OperationalCase.case_number == case_number).first()
            if not case_obj and case_number.isdigit():
                case_obj = session.query(OperationalCase).filter(OperationalCase.id == int(case_number)).first()

            if not case_obj:
                return None
            return self._case_to_dict(case_obj)
        finally:
            if close_on_exit:
                session.close()

    def execute_decision(
        self,
        case_number: str,
        decision: str,
        reviewer: str,
        comment: str,
        db: Session | None = None,
    ) -> dict[str, Any]:
        session, close_on_exit = self._get_session(db)
        try:
            self._ensure_initial_seed_cases(session)
            case_obj = (
                session.query(OperationalCase)
                .filter(OperationalCase.case_number == case_number)
                .with_for_update()
                .first()
            )
            if not case_obj and case_number.isdigit():
                case_obj = (
                    session.query(OperationalCase)
                    .filter(OperationalCase.id == int(case_number))
                    .with_for_update()
                    .first()
                )

            if not case_obj:
                return {"status": "ERROR", "message": f"Case {case_number} not found."}

            if case_obj.status in ["APPROVED", "DENIED", "EXECUTED", "CLOSED"]:
                return {
                    "status": "ERROR",
                    "message": f"Case '{case_number}' is already resolved ({case_obj.status}) and cannot be modified.",
                }

            old_status = case_obj.status
            valid_decisions = ["APPROVED", "DENIED", "CONTESTED", "RETURNED", "ESCALATED", "EXECUTED"]
            decision_upper = decision.upper()

            if decision_upper not in valid_decisions:
                return {
                    "status": "ERROR",
                    "message": f"Invalid decision '{decision}'. Must be one of {valid_decisions}.",
                }

            now = datetime.now(UTC)
            new_status = decision_upper

            case_obj.status = new_status
            case_obj.updated_at = now
            if new_status in ["APPROVED", "DENIED", "EXECUTED"]:
                case_obj.resolved_at = now

            event_obj = CaseEvent(
                case_id=case_obj.id,
                event_type=decision_upper,
                performed_by=reviewer,
                old_status=old_status,
                new_status=new_status,
                comment=comment,
                created_at=now,
            )
            session.add(event_obj)
            session.flush()

            # Trigger notification
            try:
                from app.services.notification_service import notification_service
                severity = "SUCCESS" if decision_upper in ["APPROVED", "EXECUTED"] else "WARNING" if decision_upper == "DENIED" else "INFO"
                notification_service.create_notification(
                    notif_type="ONE_TO_ONE",
                    title=f"Case {case_obj.case_number} {decision_upper}",
                    message=f"Case #{case_obj.case_number} ({case_obj.case_type}) was marked {decision_upper} by {reviewer}. Notes: {comment}",
                    severity=severity,
                    recipient_id=case_obj.created_by,
                    recipient_role="STAFF",
                    case_id=case_obj.case_number,
                    action_url="/attention",
                    db=session,
                )
            except Exception as e:
                print(f"Notification notice: {e}")

            session.commit()
            session.refresh(case_obj)

            return {
                "status": "SUCCESS",
                "case_number": case_obj.case_number,
                "decision": decision_upper,
                "new_status": new_status,
                "reviewer": reviewer,
                "comment": comment,
                "executed_at": now.isoformat(),
                "message": f"Decision '{decision_upper}' recorded in immutable timeline for case {case_obj.case_number}.",
            }
        except Exception:
            session.rollback()
            raise
        finally:
            if close_on_exit:
                session.close()


case_service = UnifiedCaseService()
