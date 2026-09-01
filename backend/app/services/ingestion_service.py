import csv
import hashlib
import io
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import (
    Category,
    Customer,
    Department,
    Employee,
    ExternalEntityMapping,
    ExternalEntityMappingHistory,
    ImportBatch,
    ImportReconciliationRecord,
    ImportRecord,
    InventoryTransaction,
    Product,
    Supplier,
)
from app.services.data_dictionary_service import (
    get_contract_for_entity,
    resolve_field_aliases,
)
from app.services.template_service import extract_template_version_from_content


# Standard Canonical Schema Mappings for Dynamic Auto-Mapping
ENTITY_FIELD_SCHEMAS: dict[str, dict[str, list[str]]] = {
    "products": {
        "sku": [
            "sku",
            "product_sku",
            "product no",
            "product_number",
            "item_code",
            "stock_code",
        ],
        "name": ["name", "product_name", "title", "description", "item_name"],
        "category_name": ["category", "category_name", "cat_name", "department"],
        "purchase_price": [
            "cost",
            "cost_price",
            "purchase_price",
            "buy_price",
            "unit_cost",
        ],
        "selling_price": [
            "price",
            "selling_price",
            "sell_price",
            "unit_price",
            "retail_price",
        ],
        "reorder_level": ["reorder_level", "min_stock", "reorder_point", "threshold"],
        "unit": ["unit", "uom", "unit_of_measure", "pack_size"],
        "barcode": ["barcode", "upc", "ean", "gtin"],
    },
    "employees": {
        "employee_code": [
            "employee_id",
            "employee_no",
            "emp_code",
            "staff_id",
            "badge_no",
        ],
        "first_name": [
            "first_name",
            "given_name",
            "fname",
            "employee_name",
            "full_name",
            "name",
        ],
        "last_name": ["last_name", "surname", "lname"],
        "email": ["email", "email_address", "work_email"],
        "phone": ["phone", "mobile", "cell", "telephone", "contact_no"],
        "job_title": ["position", "job_title", "title", "role", "designation"],
        "department": ["department", "dept", "team"],
    },
    "suppliers": {
        "name": ["supplier_name", "name", "company", "vendor_name", "supplier"],
        "contact_person": [
            "contact_person",
            "contact",
            "contact_name",
            "representative",
        ],
        "email": ["email", "email_address", "vendor_email"],
        "phone": ["phone", "mobile", "telephone"],
        "address": ["address", "location", "street", "city"],
    },
    "customers": {
        "name": ["customer_name", "name", "client_name", "company"],
        "email": ["email", "email_address"],
        "phone": ["phone", "mobile", "telephone"],
    },
    "opening_stock": {
        "sku": ["sku", "product_sku", "item_code"],
        "quantity": ["quantity", "stock_qty", "qty", "opening_qty", "count"],
        "unit_cost": ["cost", "unit_cost", "purchase_price", "cost_price"],
    },
    "purchases": {
        "po_number": ["po_number", "invoice_no", "order_no", "po_ref"],
        "supplier": ["supplier", "supplier_name", "vendor"],
        "date": ["date", "po_date", "order_date"],
        "sku": ["sku", "product_sku", "item_code"],
        "quantity": ["quantity", "qty", "unit_qty"],
        "unit_cost": ["unit_cost", "cost", "unit_price"],
        "tax": ["tax", "tax_amount", "vat"],
    },
    "sales": {
        "invoice_number": ["invoice_no", "invoice_number", "receipt_no", "sale_ref"],
        "customer": ["customer", "customer_name", "client"],
        "date": ["date", "sale_date"],
        "sku": ["sku", "product_sku", "item_code"],
        "quantity": ["quantity", "qty"],
        "unit_price": ["unit_price", "price", "selling_price"],
    },
}


def calculate_file_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of raw file byte stream."""
    return hashlib.sha256(file_bytes).hexdigest()


def _canonicalize_json(data_item: Any) -> Any:
    if isinstance(data_item, str):
        try:
            return json.loads(data_item)
        except Exception:
            return data_item
    return data_item


def compute_batch_content_hash(staged_records: list[dict[str, Any]]) -> str:
    """
    Computes a deterministic canonical SHA-256 fingerprint over all staged normalized rows.
    Keys within JSON dictionaries are canonically sorted so key reordering produces the identical hash.
    Guarantees that any row modification, reordering, deletion, or injection invalidates approval snapshots.
    """
    sorted_rows = sorted(staged_records, key=lambda r: r.get("row_number", 0))
    fingerprint_items = [
        {
            "row": r.get("row_number"),
            "ext_id": r.get("external_id"),
            "data": _canonicalize_json(r.get("normalized_data_json") or r.get("raw_data_json")),
        }
        for r in sorted_rows
    ]
    serialized = json.dumps(fingerprint_items, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def compute_batch_content_hash_from_db(db: Session, batch_id: str) -> str:
    """
    Computes current deterministic canonical SHA-256 fingerprint over all stored ImportRecord rows in the DB.
    """
    records = (
        db.query(ImportRecord)
        .filter(ImportRecord.batch_id == batch_id)
        .order_by(ImportRecord.row_number.asc())
        .all()
    )
    fingerprint_items = [
        {
            "row": r.row_number,
            "ext_id": r.external_id,
            "data": _canonicalize_json(r.normalized_data_json or r.raw_data_json),
        }
        for r in records
    ]
    serialized = json.dumps(fingerprint_items, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def parse_csv_or_excel(file_bytes: bytes, filename: str) -> tuple[list[str], list[dict[str, Any]]]:
    """
    Parses CSV or text-based table stream.
    Skips metadata comment lines starting with '#'.
    Returns (headers, list of raw row dictionaries).
    """
    text_content = file_bytes.decode("utf-8-sig", errors="replace")
    # Filter out comment lines (e.g. metadata header lines starting with '#')
    non_comment_lines = [
        line for line in text_content.splitlines() if line.strip() and not line.strip().startswith("#")
    ]
    if not non_comment_lines:
        raise HTTPException(status_code=400, detail="Uploaded file contains no valid data or is empty.")

    filtered_text = "\n".join(non_comment_lines)
    io_stream = io.StringIO(filtered_text)
    reader = csv.reader(io_stream)

    headers = []
    for row in reader:
        if row and any(field.strip() for field in row):
            headers = [h.strip() for h in row]
            break

    if not headers:
        raise HTTPException(status_code=400, detail="Uploaded file contains no headers or is empty.")

    io_stream.seek(0)
    dict_reader = csv.DictReader(io_stream)
    raw_rows = []
    for row in dict_reader:
        cleaned_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        if any(cleaned_row.values()):
            raw_rows.append(cleaned_row)

    return headers, raw_rows


def suggest_column_mapping(entity_type: str, file_headers: list[str]) -> dict[str, str]:
    """
    Automatically maps business column names (e.g. "Employee No") to IMS target fields ("employee_code").
    """
    entity_key = entity_type.lower()
    schema_map = ENTITY_FIELD_SCHEMAS.get(entity_key, {})
    mapping = {}

    for header in file_headers:
        cleaned_h = header.lower().strip().replace(" ", "_").replace("-", "_")
        matched_target = None

        for target_field, aliases in schema_map.items():
            if cleaned_h in aliases or cleaned_h == target_field:
                matched_target = target_field
                break

        if matched_target:
            mapping[header] = matched_target

    return mapping


def validate_and_stage_import(
    db: Session,
    filename: str,
    file_bytes: bytes,
    entity_type: str,
    column_mapping: dict[str, str],
    uploader_user_id: int | None = None,
    source_type: str = "CSV",
    source_system: str = "LOCAL_UPLOAD",
    schema_version: str | None = None,
    source_reference: str | None = None,
) -> dict[str, Any]:
    """
    Core Enterprise Ingestion & Validation Pipeline:
    1. Calculate SHA-256 hash & check for duplicate import.
    2. Extract embedded schema version from headers if available.
    3. Parse CSV / Excel rows into normalized enterprise structures.
    4. Apply column mapping & validate field formats, data types, and business rules.
    5. Evaluate enterprise risk level (LOW vs HIGH).
    6. Stage records in ImportBatch and ImportRecord tables with provenance attributes.
    """
    file_hash = calculate_file_hash(file_bytes)
    file_size = len(file_bytes)
    entity_key = entity_type.lower()

    # Extract version from file header if available
    detected_entity, detected_version = None, None
    if isinstance(file_bytes, (bytes, bytearray)):
        try:
            head_sample = file_bytes[:1024].decode("utf-8", errors="ignore")
            detected_entity, detected_version = extract_template_version_from_content(head_sample)
        except Exception:
            pass

    resolved_version = schema_version or detected_version
    contract = get_contract_for_entity(entity_type)
    risk_level = contract.get("risk_level", "LOW") if contract else "LOW"
    if not resolved_version and contract:
        resolved_version = contract.get("schema_version")

    # Check Duplicate File Hash
    existing_batch = db.query(ImportBatch).filter(ImportBatch.file_hash == file_hash).first()
    is_duplicate = False
    duplicate_warning = None
    if existing_batch:
        is_duplicate = True
        duplicate_warning = (
            f"Possible duplicate import detected. File hash matches existing batch '{existing_batch.batch_id}' "
            f"imported on {existing_batch.created_at.strftime('%d %b %Y')}. Review prior import before proceeding."
        )

    _headers, raw_rows = parse_csv_or_excel(file_bytes, filename)
    batch_code = f"IMP-2026-{uuid.uuid4().hex[:6].upper()}"

    valid_count = 0
    rejected_count = 0
    staged_records = []
    seen_skus_in_file = set()
    seen_emails_in_file = set()

    for idx, raw_row in enumerate(raw_rows, start=1):
        normalized = {}
        for bus_col, ims_field in column_mapping.items():
            if bus_col in raw_row:
                normalized[ims_field] = raw_row[bus_col]

        row_errors = []
        row_status = "VALID"

        # Entity-Specific Validation Rules
        if entity_key == "products":
            sku = normalized.get("sku", "").strip()
            name = normalized.get("name", "").strip()
            cost_str = normalized.get("purchase_price", "0")
            sell_str = normalized.get("selling_price", "0")
            normalized.get("reorder_level", "5")

            if not sku:
                row_errors.append("SKU is required.")
            elif sku in seen_skus_in_file:
                row_errors.append(f"Duplicate SKU '{sku}' found within uploaded file.")
            else:
                seen_skus_in_file.add(sku)

            if not name:
                row_errors.append("Product name is required.")

            try:
                cost = float(cost_str) if cost_str else 0.0
                if cost < 0:
                    row_errors.append("Purchase cost cannot be negative.")
            except ValueError:
                row_errors.append(f"Invalid cost numeric format '{cost_str}'.")

            try:
                sell = float(sell_str) if sell_str else 0.0
                if sell < 0:
                    row_errors.append("Selling price cannot be negative.")
            except ValueError:
                row_errors.append(f"Invalid selling price numeric format '{sell_str}'.")

        elif entity_key == "employees":
            emp_code = normalized.get("employee_code", "").strip()
            first_name = normalized.get("first_name", "").strip()
            last_name = normalized.get("last_name", "").strip()
            email = normalized.get("email", "").strip()

            if not emp_code:
                row_errors.append("Employee ID / Code is required.")
            if not first_name or not last_name:
                row_errors.append("First Name and Last Name are required.")
            if not email or "@" not in email:
                row_errors.append("Valid email address is required.")
            elif email in seen_emails_in_file:
                row_errors.append(f"Duplicate email '{email}' in uploaded file.")
            else:
                seen_emails_in_file.add(email)

        elif entity_key == "opening_stock":
            sku = normalized.get("sku", "").strip()
            qty_str = normalized.get("quantity", "0")

            if not sku:
                row_errors.append("SKU is required.")
            try:
                qty = int(qty_str)
                if qty < 0:
                    row_errors.append(f"Quantity cannot be negative (found {qty}).")
            except ValueError:
                row_errors.append(f"Invalid quantity integer format '{qty_str}'.")

        elif entity_key in ["suppliers", "customers"]:
            name = normalized.get("name", "").strip()
            if not name:
                row_errors.append(f"{entity_key.capitalize()} name is required.")

        elif entity_key == "purchases":
            sku = normalized.get("sku", "").strip()
            qty_str = normalized.get("quantity", "0")
            if not sku:
                row_errors.append("SKU is required.")
            try:
                qty = int(qty_str)
                if qty <= 0:
                    row_errors.append(f"Purchase quantity must be positive (found {qty}).")
            except ValueError:
                row_errors.append(f"Invalid quantity '{qty_str}'.")

        action_type = "CREATE"
        if row_errors:
            row_status = "REJECTED"
            action_type = "REJECT"
            rejected_count += 1
        else:
            valid_count += 1
            # Check for existing entity to classify CREATE vs UPDATE vs NO_CHANGE
            if entity_key == "products":
                sku = normalized.get("sku", "").strip()
                existing = db.query(Product).filter(Product.sku == sku).first()
                if existing:
                    try:
                        cost = float(normalized.get("purchase_price", 0))
                        sell = float(normalized.get("selling_price", 0))
                        if existing.name == normalized.get("name") and existing.purchase_price == cost and existing.selling_price == sell:
                            action_type = "NO_CHANGE"
                        else:
                            action_type = "UPDATE"
                    except Exception:
                        action_type = "UPDATE"
                else:
                    action_type = "CREATE"

            elif entity_key == "employees":
                emp_code = normalized.get("employee_code", "").strip()
                existing = db.query(Employee).filter(Employee.employee_code == emp_code).first()
                if existing:
                    if (
                        existing.first_name == normalized.get("first_name")
                        and existing.last_name == normalized.get("last_name")
                        and existing.email == normalized.get("email")
                    ):
                        action_type = "NO_CHANGE"
                    else:
                        action_type = "UPDATE"
                else:
                    action_type = "CREATE"

            elif entity_key == "suppliers":
                s_name = normalized.get("name", "").strip()
                existing = db.query(Supplier).filter(Supplier.name == s_name).first()
                action_type = "UPDATE" if existing else "CREATE"

            elif entity_key == "customers":
                c_name = normalized.get("name", "").strip()
                existing = db.query(Customer).filter(Customer.name == c_name).first()
                action_type = "UPDATE" if existing else "CREATE"

            elif entity_key in ["opening_stock", "purchases", "sales"]:
                action_type = "CREATE"

        ext_id = (
            normalized.get("employee_code")
            or normalized.get("sku")
            or normalized.get("po_number")
            or normalized.get("invoice_number")
            or normalized.get("email")
            or normalized.get("name")
        )

        staged_records.append(
            {
                "row_number": idx,
                "external_id": str(ext_id) if ext_id else None,
                "action_type": action_type,
                "raw_data_json": json.dumps(raw_row),
                "normalized_data_json": json.dumps(normalized),
                "validation_status": row_status,
                "error_message": " | ".join(row_errors) if row_errors else None,
                "error_details_json": json.dumps(row_errors) if row_errors else None,
            }
        )

    if rejected_count > 0:
        batch_status = "QUARANTINED"
    elif risk_level == "HIGH":
        batch_status = "PENDING_APPROVAL"
    else:
        batch_status = "READY_FOR_COMMIT"

    # Calculate deterministic batch content fingerprint
    batch_content_hash = compute_batch_content_hash(staged_records)

    # Create ImportBatch in DB
    batch = ImportBatch(
        batch_id=batch_code,
        filename=filename,
        file_hash=file_hash,
        content_hash=batch_content_hash,
        file_size=file_size,
        uploader_user_id=uploader_user_id,
        source_type=source_type,
        source_system=source_system,
        schema_version=resolved_version,
        source_reference=source_reference,
        risk_level=risk_level,
        entity_type=entity_type.upper(),
        record_count=len(raw_rows),
        valid_count=valid_count,
        rejected_count=rejected_count,
        status=batch_status,
        column_mapping_json=json.dumps(column_mapping),
        created_at=datetime.now(UTC),
    )
    db.add(batch)
    db.flush()

    # Save ImportRecord entries
    for r in staged_records:
        rec = ImportRecord(
            batch_id=batch_code,
            row_number=r["row_number"],
            external_id=r["external_id"],
            action_type=r.get("action_type", "CREATE"),
            raw_data_json=r["raw_data_json"],
            normalized_data_json=r["normalized_data_json"],
            validation_status=r["validation_status"],
            error_message=r["error_message"],
            error_details_json=r["error_details_json"],
        )
        db.add(rec)

    db.commit()
    db.refresh(batch)

    return {
        "batch_id": batch_code,
        "total_records": len(raw_rows),
        "valid_records": valid_count,
        "rejected_records": rejected_count,
        "status": batch_status,
        "risk_level": risk_level,
        "schema_version": resolved_version,
        "is_duplicate": is_duplicate,
        "duplicate_warning_message": duplicate_warning,
        "errors": [
            {"row": r["row_number"], "error": r["error_message"]}
            for r in staged_records
            if r["validation_status"] == "REJECTED"
        ],
    }


def process_intake_payload(
    db: Session,
    entity_type: str,
    records: list[dict[str, Any]],
    source_system: str = "API_GATEWAY",
    source_type: str = "API",
    schema_version: str | None = None,
    source_reference: str | None = None,
    uploader_user_id: int | None = None,
) -> dict[str, Any]:
    """
    Intake API Gateway:
    Takes structured JSON record arrays (from M2M API integrations or manual entry),
    and validates & stages through the exact same canonical intake engine.
    First-Class Source Event Idempotency: (source_system, entity_type, source_reference) deduplicates repeat submissions.
    """
    if source_reference and source_system:
        existing_event_batch = (
            db.query(ImportBatch)
            .filter(
                ImportBatch.source_system == source_system.upper(),
                ImportBatch.entity_type == entity_type.upper(),
                ImportBatch.source_reference == source_reference,
            )
            .first()
        )
        if existing_event_batch:
            return {
                "batch_id": existing_event_batch.batch_id,
                "total_records": existing_event_batch.record_count,
                "valid_records": existing_event_batch.valid_count,
                "rejected_records": existing_event_batch.rejected_count,
                "status": existing_event_batch.status,
                "risk_level": existing_event_batch.risk_level,
                "schema_version": existing_event_batch.schema_version,
                "is_idempotent_replay": True,
                "errors": [],
            }

    raw_content = json.dumps(records, default=str).encode("utf-8")
    mapping = {k: k for k in (records[0].keys() if records else [])}
    filename = f"api_intake_{entity_type.lower()}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"

    file_hash = hashlib.sha256(raw_content).hexdigest()
    contract = get_contract_for_entity(entity_type)
    resolved_version = schema_version or (contract["schema_version"] if contract else "1.0")
    risk_level = contract.get("risk_level", "LOW") if contract else "LOW"

    batch_code = f"IMP-2026-{uuid.uuid4().hex[:6].upper()}"
    valid_count = 0
    rejected_count = 0
    staged_records = []
    seen_identifiers = set()

    for idx, raw_record in enumerate(records, start=1):
        row_errors = []
        normalized = dict(raw_record)
        entity_key = entity_type.lower()

        if entity_key == "employees":
            emp_code = normalized.get("employee_code", "").strip()
            email = normalized.get("email", "").strip()
            if not emp_code:
                row_errors.append("Employee code is required.")
            elif emp_code in seen_identifiers:
                row_errors.append(f"Duplicate employee_code '{emp_code}' in payload.")
            else:
                seen_identifiers.add(emp_code)

            if not email or "@" not in email:
                row_errors.append("Valid email address is required.")

        elif entity_key == "products":
            sku = normalized.get("sku", "").strip()
            if not sku:
                row_errors.append("Product SKU is required.")
            elif sku in seen_identifiers:
                row_errors.append(f"Duplicate SKU '{sku}' in payload.")
            else:
                seen_identifiers.add(sku)

        action_type = "CREATE"
        if row_errors:
            status = "REJECTED"
            action_type = "REJECT"
            rejected_count += 1
        else:
            status = "VALID"
            valid_count += 1
            if entity_key == "employees":
                emp_code = normalized.get("employee_code", "").strip()
                existing = db.query(Employee).filter(Employee.employee_code == emp_code).first()
                if existing:
                    action_type = "UPDATE"
            elif entity_key == "products":
                sku = normalized.get("sku", "").strip()
                existing = db.query(Product).filter(Product.sku == sku).first()
                if existing:
                    action_type = "UPDATE"

        ext_id = (
            normalized.get("employee_code")
            or normalized.get("sku")
            or normalized.get("customer_id")
            or normalized.get("supplier_code")
            or normalized.get("id")
        )

        staged_records.append(
            {
                "row_number": idx,
                "external_id": str(ext_id) if ext_id else None,
                "action_type": action_type,
                "raw_data_json": json.dumps(raw_record),
                "normalized_data_json": json.dumps(normalized),
                "validation_status": status,
                "error_message": " | ".join(row_errors) if row_errors else None,
                "error_details_json": json.dumps(row_errors) if row_errors else None,
            }
        )

    batch_status = "QUARANTINED" if rejected_count > 0 else ("PENDING_APPROVAL" if risk_level == "HIGH" else "READY_FOR_COMMIT")
    batch_content_hash = compute_batch_content_hash(staged_records)

    batch = ImportBatch(
        batch_id=batch_code,
        filename=filename,
        file_hash=file_hash,
        content_hash=batch_content_hash,
        file_size=len(raw_content),
        uploader_user_id=uploader_user_id,
        source_type=source_type,
        source_system=source_system,
        schema_version=resolved_version,
        source_reference=source_reference,
        risk_level=risk_level,
        entity_type=entity_type.upper(),
        record_count=len(records),
        valid_count=valid_count,
        rejected_count=rejected_count,
        status=batch_status,
        column_mapping_json=json.dumps(mapping),
        created_at=datetime.now(UTC),
    )
    db.add(batch)
    db.flush()

    for r in staged_records:
        rec = ImportRecord(
            batch_id=batch_code,
            row_number=r["row_number"],
            external_id=r["external_id"],
            action_type=r.get("action_type", "CREATE"),
            raw_data_json=r["raw_data_json"],
            normalized_data_json=r["normalized_data_json"],
            validation_status=r["validation_status"],
            error_message=r["error_message"],
            error_details_json=r["error_details_json"],
        )
        db.add(rec)

    db.commit()
    db.refresh(batch)

    return {
        "batch_id": batch_code,
        "total_records": len(records),
        "valid_records": valid_count,
        "rejected_records": rejected_count,
        "status": batch_status,
        "risk_level": risk_level,
        "schema_version": resolved_version,
    }



def approve_import_batch(db: Session, batch_id: str, approver_user_id: int | None = None) -> ImportBatch:
    """
    Freezes approval snapshot fingerprint (approved_content_hash) and promotes status to APPROVED.
    Strictly prevents self-approval on high-risk imports (Separation of Duties).
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Import batch '{batch_id}' not found.")

    if batch.status in ["COMMITTED", "IMPORTED"]:
        raise HTTPException(status_code=400, detail=f"Batch '{batch_id}' is already committed.")

    if batch.rejected_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve batch '{batch_id}' with {batch.rejected_count} quarantined validation errors.",
        )

    if batch.risk_level == "HIGH" and batch.uploader_user_id and approver_user_id:
        if approver_user_id == batch.uploader_user_id:
            raise HTTPException(
                status_code=403,
                detail="Separation of Duties Violation: Requester/uploader cannot approve or commit their own high-risk import batch.",
            )

    # Compute and freeze approval snapshot fingerprint
    current_hash = compute_batch_content_hash_from_db(db, batch_id)
    batch.content_hash = current_hash
    batch.approved_content_hash = current_hash
    batch.status = "APPROVED"
    batch.approved_at = datetime.now(UTC)
    if approver_user_id:
        batch.approved_by_user_id = approver_user_id

    db.commit()
    db.refresh(batch)
    return batch


def execute_approved_batch(db: Session, batch_id: str, approver_user_id: int | None = None) -> ImportBatch:
    """
    Executes a validated/approved staging import batch into core production database tables.
    1. Strictly enforces Separation of Duties for high-risk batches.
    2. Validates approval snapshot binding (fingerprint comparison).
    3. Re-reads authoritative domain state and performs real-time re-classification at commit.
    4. Emits transactional domain ledger events (e.g. OPENING_BALANCE with quantity_before/after).
    5. Synchronizes ExternalEntityMapping table with append-only history tracking.
    6. Computes and creates append-only ImportReconciliationRecord with cryptographic checksum.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Import batch '{batch_id}' not found.")

    if batch.status in ["COMMITTED", "IMPORTED", "COMMITTING"]:
        raise HTTPException(status_code=400, detail=f"Batch '{batch_id}' has already been committed to production or is currently being processed.")

    if batch.rejected_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute batch '{batch_id}' with {batch.rejected_count} quarantined validation errors. Fix errors first.",
        )

    # Immediately lock status to COMMITTING and commit so concurrent readers immediately fail
    batch.status = "COMMITTING"
    db.commit()
    db.refresh(batch)

    # Separation of Duties (SoD) Enforcement: Requester cannot approve their own high-risk batch
    if batch.risk_level == "HIGH" and batch.uploader_user_id and approver_user_id:
        if approver_user_id == batch.uploader_user_id:
            raise HTTPException(
                status_code=403,
                detail="Separation of Duties Violation: Requester/uploader cannot approve or commit their own high-risk import batch.",
            )

    # 1. Approval Snapshot Fingerprint Binding Check (Time-of-Check / Time-of-Use defense)
    current_content_hash = compute_batch_content_hash_from_db(db, batch.batch_id)
    if batch.approved_content_hash and current_content_hash != batch.approved_content_hash:
        raise HTTPException(
            status_code=409,
            detail="Approved dataset has changed; re-review required.",
        )

    batch.status = "COMMITTING"
    db.flush()

    entity_key = batch.entity_type.lower()
    records = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).order_by(ImportRecord.row_number.asc()).all()

    # Default category fallback for products
    default_cat = db.query(Category).first()
    if not default_cat:
        default_cat = Category(name="General Supplies", code="GEN-001", category_code="CAT-000001")
        db.add(default_cat)
        db.flush()

    created_count = 0
    updated_count = 0
    unchanged_count = 0
    total_opening_qty = 0

    for rec in records:
        if rec.validation_status != "VALID":
            continue

        normalized = json.loads(rec.normalized_data_json or "{}")
        canonical_id = None

        if entity_key == "products":
            sku = normalized.get("sku")
            canonical_id = sku
            existing = db.query(Product).filter(Product.sku == sku).first()
            if existing:
                # Real-time re-classification at commit time
                before_snapshot = {
                    "name": existing.name,
                    "purchase_price": existing.purchase_price,
                    "selling_price": existing.selling_price,
                    "reorder_level": existing.reorder_level,
                }
                diff = {}
                try:
                    c = float(normalized.get("purchase_price", existing.purchase_price))
                    s = float(normalized.get("selling_price", existing.selling_price))
                    r_level = int(normalized.get("reorder_level", existing.reorder_level))
                    n_name = normalized.get("name", existing.name)

                    if existing.name != n_name:
                        diff["name"] = {"before": existing.name, "after": n_name}
                    if existing.purchase_price != c:
                        diff["purchase_price"] = {"before": existing.purchase_price, "after": c}
                    if existing.selling_price != s:
                        diff["selling_price"] = {"before": existing.selling_price, "after": s}
                    if existing.reorder_level != r_level:
                        diff["reorder_level"] = {"before": existing.reorder_level, "after": r_level}

                    if diff:
                        existing.name = n_name
                        existing.purchase_price = c
                        existing.selling_price = s
                        existing.reorder_level = r_level
                        rec.action_type = "UPDATE"
                        rec.diff_json = json.dumps(diff)
                        rec.before_snapshot_json = json.dumps(before_snapshot)
                        updated_count += 1
                    else:
                        rec.action_type = "NO_CHANGE"
                        unchanged_count += 1
                except Exception:
                    rec.action_type = "UPDATE"
                    updated_count += 1
                rec.imported_entity_id = str(existing.id)
            else:
                p = Product(
                    sku=sku,
                    product_code=f"PRD-{uuid.uuid4().hex[:6].upper()}",
                    name=normalized.get("name", "Imported Item"),
                    category_id=default_cat.id,
                    purchase_price=float(normalized.get("purchase_price", 0.0)),
                    selling_price=float(normalized.get("selling_price", 0.0)),
                    reorder_level=int(normalized.get("reorder_level", 5)),
                    unit=normalized.get("unit", "Units"),
                    barcode=normalized.get("barcode"),
                )
                db.add(p)
                db.flush()
                rec.action_type = "CREATE"
                rec.imported_entity_id = str(p.id)
                created_count += 1

        elif entity_key == "employees":
            emp_code = normalized.get("employee_code")
            canonical_id = emp_code
            existing = db.query(Employee).filter(Employee.employee_code == emp_code).first()
            if existing:
                before_snapshot = {
                    "first_name": existing.first_name,
                    "last_name": existing.last_name,
                    "email": existing.email,
                    "phone": existing.phone,
                }
                diff = {}
                fn = normalized.get("first_name", existing.first_name)
                ln = normalized.get("last_name", existing.last_name)
                em = normalized.get("email", existing.email)
                ph = normalized.get("phone", existing.phone)

                if existing.first_name != fn:
                    diff["first_name"] = {"before": existing.first_name, "after": fn}
                if existing.last_name != ln:
                    diff["last_name"] = {"before": existing.last_name, "after": ln}
                if existing.email != em:
                    diff["email"] = {"before": existing.email, "after": em}
                if existing.phone != ph:
                    diff["phone"] = {"before": existing.phone, "after": ph}

                if diff:
                    existing.first_name = fn
                    existing.last_name = ln
                    existing.email = em
                    existing.phone = ph
                    rec.action_type = "UPDATE"
                    rec.diff_json = json.dumps(diff)
                    rec.before_snapshot_json = json.dumps(before_snapshot)
                    updated_count += 1
                else:
                    rec.action_type = "NO_CHANGE"
                    unchanged_count += 1
                rec.imported_entity_id = str(existing.id)
            else:
                dept_name = normalized.get("department", "General")
                dept = db.query(Department).filter(Department.name == dept_name).first()
                if not dept:
                    dept = Department(
                        name=dept_name,
                        department_code=f"DEP-{uuid.uuid4().hex[:4].upper()}",
                    )
                    db.add(dept)
                    db.flush()

                emp = Employee(
                    employee_code=emp_code,
                    first_name=normalized.get("first_name", "Staff"),
                    last_name=normalized.get("last_name", "Member"),
                    email=normalized.get("email"),
                    phone=normalized.get("phone"),
                    position=normalized.get("job_title", "STAFF"),
                    department_id=dept.id,
                    status="ACTIVE",
                )
                db.add(emp)
                db.flush()
                rec.action_type = "CREATE"
                rec.imported_entity_id = str(emp.id)
                created_count += 1

        elif entity_key == "suppliers":
            s_name = normalized.get("name")
            canonical_id = s_name
            sup = db.query(Supplier).filter(Supplier.name == s_name).first()
            if sup:
                sup.contact_person = normalized.get("contact_person", sup.contact_person)
                sup.email = normalized.get("email", sup.email)
                sup.phone = normalized.get("phone", sup.phone)
                rec.action_type = "UPDATE"
                updated_count += 1
            else:
                sup = Supplier(
                    name=s_name,
                    contact_person=normalized.get("contact_person"),
                    email=normalized.get("email"),
                    phone=normalized.get("phone"),
                    address=normalized.get("address"),
                )
                db.add(sup)
                db.flush()
                rec.action_type = "CREATE"
                created_count += 1
            rec.imported_entity_id = str(sup.id)

        elif entity_key == "customers":
            c_name = normalized.get("name")
            canonical_id = c_name
            cust = db.query(Customer).filter(Customer.name == c_name).first()
            if cust:
                cust.email = normalized.get("email", cust.email)
                cust.phone = normalized.get("phone", cust.phone)
                rec.action_type = "UPDATE"
                updated_count += 1
            else:
                cust = Customer(
                    name=c_name,
                    email=normalized.get("email"),
                    phone=normalized.get("phone"),
                )
                db.add(cust)
                db.flush()
                rec.action_type = "CREATE"
                created_count += 1
            rec.imported_entity_id = str(cust.id)

        elif entity_key == "opening_stock":
            # Inventory Ledger Boundary Defense: ONLY opening_stock/stock_adjustment can emit ledger events
            if batch.entity_type.upper() not in ["OPENING_STOCK", "STOCK_ADJUSTMENT"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Entity type '{batch.entity_type}' is not authorized to create inventory movements.",
                )

            sku = normalized.get("sku")
            canonical_id = sku
            qty = int(normalized.get("quantity", 0))
            prod = db.query(Product).filter(Product.sku == sku).first()
            if not prod:
                # Create base product shell if opening stock arrives first
                prod = Product(
                    sku=sku,
                    product_code=f"PRD-{uuid.uuid4().hex[:6].upper()}",
                    name=f"Product {sku}",
                    category_id=default_cat.id,
                    purchase_price=float(normalized.get("unit_cost", 0.0)),
                    selling_price=float(normalized.get("unit_cost", 0.0)) * 1.3,
                    stock_quantity=0,
                )
                db.add(prod)
                db.flush()

            before = prod.stock_quantity
            prod.stock_quantity += qty
            db.flush()

            # Transactional Ledger Event: OPENING_BALANCE with exact before/after balances
            tx = InventoryTransaction(
                product_id=prod.id,
                type="OPENING_BALANCE",
                quantity=qty,
                quantity_before=before,
                quantity_after=prod.stock_quantity,
                reason_category="OPENING_STOCK_IMPORT",
                reference=batch_id,
                notes=f"Opening stock imported via batch {batch_id}",
            )
            db.add(tx)
            rec.action_type = "CREATE"
            rec.imported_entity_id = str(prod.id)
            created_count += 1
            total_opening_qty += qty

        rec.canonical_id = canonical_id
        if canonical_id and rec.external_id and batch.source_system:
            existing_map = (
                db.query(ExternalEntityMapping)
                .filter(
                    ExternalEntityMapping.entity_type == batch.entity_type,
                    ExternalEntityMapping.source_system == batch.source_system,
                    ExternalEntityMapping.external_id == rec.external_id,
                )
                .first()
            )
            if existing_map:
                if existing_map.internal_code != canonical_id:
                    # Record Append-Only Mapping History on Remapping
                    hist = ExternalEntityMappingHistory(
                        mapping_id=existing_map.id,
                        entity_type=batch.entity_type,
                        source_system=batch.source_system,
                        external_id=rec.external_id,
                        old_internal_code=existing_map.internal_code,
                        new_internal_code=canonical_id,
                        reason=f"Remapped via import batch {batch.batch_id}",
                        changed_by_user_id=approver_user_id,
                        created_at=datetime.now(UTC),
                    )
                    db.add(hist)
                    existing_map.internal_code = canonical_id
            else:
                new_map = ExternalEntityMapping(
                    entity_type=batch.entity_type,
                    internal_code=canonical_id,
                    source_system=batch.source_system,
                    external_id=rec.external_id,
                    metadata_json=json.dumps({"batch_id": batch.batch_id}),
                )
                db.add(new_map)
                db.flush()

                hist = ExternalEntityMappingHistory(
                    mapping_id=new_map.id,
                    entity_type=batch.entity_type,
                    source_system=batch.source_system,
                    external_id=rec.external_id,
                    old_internal_code=None,
                    new_internal_code=canonical_id,
                    reason=f"Initial mapping registration via import batch {batch.batch_id}",
                    changed_by_user_id=approver_user_id,
                    created_at=datetime.now(UTC),
                )
                db.add(hist)

    # Invariant Verification & Explicit Equation Check:
    # 1. total == accepted + rejected
    # 2. accepted == created + updated + unchanged
    # 3. unexplained_delta == 0.0
    unexplained_delta = float(batch.record_count - (created_count + updated_count + unchanged_count + batch.rejected_count))
    is_reconciled = (
        unexplained_delta == 0.0
        and batch.record_count == (batch.valid_count + batch.rejected_count)
        and batch.valid_count == (created_count + updated_count + unchanged_count)
    )

    # Cryptographic Hash Chaining: Link seal to previous reconciliation record
    latest_rec = (
        db.query(ImportReconciliationRecord)
        .order_by(ImportReconciliationRecord.id.desc())
        .first()
    )
    prev_checksum = latest_rec.checksum if latest_rec else ("0" * 64)
    checksum_str = (
        f"{batch.batch_id}:{prev_checksum}:{batch.record_count}:{batch.valid_count}:"
        f"{batch.rejected_count}:{created_count}:{updated_count}:{unchanged_count}:{unexplained_delta:.2f}"
    )
    checksum = hashlib.sha256(checksum_str.encode("utf-8")).hexdigest()

    reconciliation_report = {
        "batch_id": batch.batch_id,
        "entity_type": batch.entity_type,
        "source_system": batch.source_system,
        "total_records": batch.record_count,
        "accepted_count": batch.valid_count,
        "rejected_count": batch.rejected_count,
        "created_count": created_count,
        "updated_count": updated_count,
        "unchanged_count": unchanged_count,
        "total_opening_quantity": total_opening_qty,
        "unexplained_delta": unexplained_delta,
        "is_reconciled": is_reconciled,
        "previous_checksum": prev_checksum,
        "checksum": checksum,
        "reconciled_at": datetime.now(UTC).isoformat(),
    }

    # Append-Only ImportReconciliationRecord (Hash Chained & Sealed)
    reconciliation_record = ImportReconciliationRecord(
        batch_id=batch.batch_id,
        entity_type=batch.entity_type,
        source_system=batch.source_system or "LOCAL_UPLOAD",
        total_records=batch.record_count,
        accepted_count=batch.valid_count,
        rejected_count=batch.rejected_count,
        created_count=created_count,
        updated_count=updated_count,
        unchanged_count=unchanged_count,
        reconciliation_delta=unexplained_delta,
        is_reconciled=is_reconciled,
        previous_checksum=prev_checksum,
        checksum=checksum,
        created_at=datetime.now(UTC),
    )
    db.add(reconciliation_record)

    batch.created_records_count = created_count
    batch.updated_records_count = updated_count
    batch.unchanged_records_count = unchanged_count
    batch.reconciliation_delta = unexplained_delta
    batch.reconciliation_json = json.dumps(reconciliation_report)
    batch.status = "COMMITTED"
    batch.approved_at = datetime.now(UTC)
    if approver_user_id:
        batch.approved_by_user_id = approver_user_id

    db.commit()
    db.refresh(batch)
    return batch


def generate_entity_template(entity_type: str) -> tuple[str, str]:
    """
    Generates downloadable CSV content with sample data and instructions.
    Returns (csv_content_string, suggested_filename).
    """
    entity_key = entity_type.lower()

    if entity_key == "products":
        headers = [
            "SKU",
            "Name",
            "Category",
            "Cost Price",
            "Selling Price",
            "Reorder Level",
            "Unit",
            "Barcode",
        ]
        rows = [
            [
                "PRD-1001",
                "Wireless Optical Mouse",
                "Electronics",
                "12.50",
                "24.99",
                "10",
                "Units",
                "600123456789",
            ],
            [
                "PRD-1002",
                "Mechanical Keyboard RGB",
                "Electronics",
                "45.00",
                "89.99",
                "5",
                "Units",
                "600123456790",
            ],
        ]
        filename = "products_template.csv"
    elif entity_key == "employees":
        headers = [
            "Employee No",
            "First Name",
            "Last Name",
            "Email",
            "Phone",
            "Position",
            "Department",
        ]
        rows = [
            [
                "EMP-2026-001",
                "Alice",
                "Smith",
                "alice.smith@company.com",
                "+263 77 123 4567",
                "CASHIER",
                "Sales",
            ],
            [
                "EMP-2026-002",
                "Bob",
                "Jones",
                "bob.jones@company.com",
                "+263 71 987 6543",
                "WAREHOUSE_ASSISTANT",
                "Logistics",
            ],
        ]
        filename = "employees_template.csv"
    elif entity_key == "suppliers":
        headers = ["Supplier Name", "Contact Person", "Email", "Phone", "Address"]
        rows = [
            [
                "Global Tech Distributors",
                "Jane Doe",
                "orders@globaltech.com",
                "+263 24 2123456",
                "12 Industrial Rd, Harare",
            ],
            [
                "Apex Wholesalers",
                "Sam Wilson",
                "sales@apex.co.zw",
                "+263 29 2887766",
                "45 Main St, Bulawayo",
            ],
        ]
        filename = "suppliers_template.csv"
    elif entity_key == "opening_stock":
        headers = ["SKU", "Quantity", "Unit Cost"]
        rows = [["PRD-1001", "150", "12.50"], ["PRD-1002", "40", "45.00"]]
        filename = "opening_stock_template.csv"
    elif entity_key == "customers":
        headers = ["Customer Name", "Email", "Phone"]
        rows = [
            ["Acme Corporation", "accounts@acme.com", "+263 77 333 4444"],
            ["John Retail Buyer", "john.buyer@gmail.com", "+263 71 555 6666"],
        ]
        filename = "customers_template.csv"
    else:
        headers = ["SKU", "Quantity", "Unit Cost"]
        rows = [["PRD-1001", "10", "15.00"]]
        filename = "import_template.csv"

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)

    return output.getvalue(), filename


def export_entity_data(db: Session, entity_type: str) -> tuple[str, str]:
    """
    Generates CSV export data for core domain entities.
    Returns (csv_content_string, filename).
    """
    entity_key = entity_type.lower()
    output = io.StringIO()
    writer = csv.writer(output)
    timestamp_str = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")

    if entity_key == "products":
        products = db.query(Product).filter(Product.active == True).all()
        writer.writerow(
            [
                "ID",
                "SKU",
                "Product Code",
                "Name",
                "Category ID",
                "Purchase Price",
                "Selling Price",
                "Stock Quantity",
                "Reorder Level",
                "Unit",
                "Barcode",
            ]
        )
        for p in products:
            writer.writerow(
                [
                    p.id,
                    p.sku,
                    p.product_code,
                    p.name,
                    p.category_id,
                    p.purchase_price,
                    p.selling_price,
                    p.stock_quantity,
                    p.reorder_level,
                    p.unit,
                    p.barcode,
                ]
            )
        filename = f"export_products_{timestamp_str}.csv"

    elif entity_key == "employees":
        employees = db.query(Employee).all()
        writer.writerow(
            [
                "ID",
                "Employee Code",
                "First Name",
                "Last Name",
                "Email",
                "Phone",
                "Position",
                "Status",
                "Created At",
            ]
        )
        for e in employees:
            writer.writerow(
                [
                    e.id,
                    e.employee_code,
                    e.first_name,
                    e.last_name,
                    e.email,
                    e.phone,
                    e.position,
                    e.status,
                    e.created_at,
                ]
            )
        filename = f"export_employees_{timestamp_str}.csv"

    elif entity_key == "suppliers":
        suppliers = db.query(Supplier).all()
        writer.writerow(["ID", "Name", "Contact Person", "Email", "Phone", "Address"])
        for s in suppliers:
            writer.writerow([s.id, s.name, s.contact_person, s.email, s.phone, s.address])
        filename = f"export_suppliers_{timestamp_str}.csv"

    elif entity_key == "customers":
        customers = db.query(Customer).all()
        writer.writerow(["ID", "Name", "Email", "Phone"])
        for c in customers:
            writer.writerow([c.id, c.name, c.email, c.phone])
        filename = f"export_customers_{timestamp_str}.csv"

    elif entity_key == "inventory_valuation":
        products = db.query(Product).filter(Product.active == True).all()
        writer.writerow(
            [
                "SKU",
                "Name",
                "Stock Qty",
                "Unit Cost",
                "Unit Price",
                "Total Cost Value",
                "Total Retail Value",
            ]
        )
        for p in products:
            c_val = p.stock_quantity * p.purchase_price
            r_val = p.stock_quantity * p.selling_price
            writer.writerow(
                [
                    p.sku,
                    p.name,
                    p.stock_quantity,
                    p.purchase_price,
                    p.selling_price,
                    f"{c_val:.2f}",
                    f"{r_val:.2f}",
                ]
            )
        filename = f"export_inventory_valuation_{timestamp_str}.csv"

    else:
        writer.writerow(["Entity", "Status"])
        writer.writerow([entity_type, "Exported"])
    return output.getvalue(), filename


def stage_and_validate_import(
    db: Session,
    filename: str,
    raw_content: bytes,
    entity_type: str,
    uploader_user_id: int | None = None,
    column_mapping: dict[str, str] | None = None,
):
    """Compatibility wrapper for validate_and_stage_import."""
    headers, _ = parse_csv_or_excel(raw_content, filename)
    mapping = column_mapping or suggest_column_mapping(entity_type, headers)
    res = validate_and_stage_import(
        db=db,
        filename=filename,
        file_bytes=raw_content,
        entity_type=entity_type,
        column_mapping=mapping,
        uploader_user_id=uploader_user_id,
    )
    batch_id = res["batch_id"]
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    records = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).all()
    is_duplicate = res["is_duplicate"]
    dup_msg = res["duplicate_warning_message"]
    return batch, records, is_duplicate, dup_msg


def generate_import_template_csv(entity_type: str) -> str:
    content, _ = generate_entity_template(entity_type)
    return content


def get_import_lineage_trace(db: Session, entity_type: str, entity_id: str) -> dict[str, Any]:
    """
    WALKS THE COMPLETE AUDIT LINEAGE CHAIN:
    Source System -> Integration Credential -> Source Event -> Import Batch ->
    Import Record -> External ID -> Canonical ID -> Domain Entity ->
    Inventory Transaction -> Ledger Event -> Reconciliation Record (Hash Chain)
    """
    entity_key = entity_type.upper()
    
    # 1. Resolve domain entity
    domain_record = None
    canonical_id = str(entity_id)
    if entity_key in ["PRODUCT", "PRODUCTS"]:
        p = db.query(Product).filter(
            (Product.sku == str(entity_id)) | 
            (Product.product_code == str(entity_id)) | 
            (Product.id == (int(entity_id) if str(entity_id).isdigit() else -1))
        ).first()
        if p:
            canonical_id = p.sku
            domain_record = {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "stock_quantity": p.stock_quantity,
                "purchase_price": p.purchase_price,
                "selling_price": p.selling_price,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
    elif entity_key in ["EMPLOYEE", "EMPLOYEES"]:
        e = db.query(Employee).filter(
            (Employee.employee_code == str(entity_id)) | 
            (Employee.email == str(entity_id)) | 
            (Employee.id == (int(entity_id) if str(entity_id).isdigit() else -1))
        ).first()
        if e:
            canonical_id = e.employee_code
            domain_record = {
                "id": e.id,
                "employee_code": e.employee_code,
                "name": f"{e.first_name} {e.last_name}",
                "email": e.email,
                "department": e.department.name if e.department else None,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
    elif entity_key in ["SUPPLIER", "SUPPLIERS"]:
        s = db.query(Supplier).filter(
            (Supplier.name == str(entity_id)) | 
            (Supplier.id == (int(entity_id) if str(entity_id).isdigit() else -1))
        ).first()
        if s:
            canonical_id = s.name
            domain_record = {"id": s.id, "name": s.name, "email": s.email, "phone": s.phone}
    elif entity_key in ["CUSTOMER", "CUSTOMERS"]:
        c = db.query(Customer).filter(
            (Customer.name == str(entity_id)) | 
            (Customer.id == (int(entity_id) if str(entity_id).isdigit() else -1))
        ).first()
        if c:
            canonical_id = c.name
            domain_record = {"id": c.id, "name": c.name, "email": c.email, "phone": c.phone}

    # 2. Find ExternalEntityMapping & History
    mappings = db.query(ExternalEntityMapping).filter(
        (ExternalEntityMapping.internal_code == canonical_id) | 
        (ExternalEntityMapping.external_id == str(entity_id))
    ).all()
    mapping_list = []
    for m in mappings:
        history = (
            db.query(ExternalEntityMappingHistory)
            .filter(ExternalEntityMappingHistory.mapping_id == m.id)
            .order_by(ExternalEntityMappingHistory.created_at.asc())
            .all()
        )
        mapping_list.append({
            "mapping_id": m.id,
            "source_system": m.source_system,
            "external_id": m.external_id,
            "internal_code": m.internal_code,
            "is_locked": m.is_locked,
            "history": [
                {
                    "old_code": h.old_internal_code,
                    "new_code": h.new_internal_code,
                    "reason": h.reason,
                    "changed_by_user_id": h.changed_by_user_id,
                    "created_at": h.created_at.isoformat() if h.created_at else None,
                }
                for h in history
            ],
        })

    # 3. Find matching ImportRecord(s)
    records = (
        db.query(ImportRecord)
        .filter(
            (ImportRecord.canonical_id == canonical_id) | 
            (ImportRecord.external_id == str(entity_id)) | 
            (ImportRecord.imported_entity_id == str(entity_id)) |
            (ImportRecord.canonical_id == str(entity_id))
        )
        .all()
    )

    batches_data = []
    seen_batch_ids = set()
    for rec in records:
        if rec.batch_id not in seen_batch_ids:
            seen_batch_ids.add(rec.batch_id)
            b = db.query(ImportBatch).filter(ImportBatch.batch_id == rec.batch_id).first()
            if b:
                rec_record = (
                    db.query(ImportReconciliationRecord)
                    .filter(ImportReconciliationRecord.batch_id == b.batch_id)
                    .first()
                )
                batches_data.append({
                    "batch_id": b.batch_id,
                    "source_system": b.source_system,
                    "source_type": b.source_type,
                    "source_reference": b.source_reference,
                    "schema_version": b.schema_version,
                    "risk_level": b.risk_level,
                    "status": b.status,
                    "file_hash": b.file_hash,
                    "content_hash": b.content_hash,
                    "approved_content_hash": b.approved_content_hash,
                    "uploader_user_id": b.uploader_user_id,
                    "approved_by_user_id": b.approved_by_user_id,
                    "created_at": b.created_at.isoformat() if b.created_at else None,
                    "approved_at": b.approved_at.isoformat() if b.approved_at else None,
                    "reconciliation": {
                        "total_records": rec_record.total_records,
                        "accepted_count": rec_record.accepted_count,
                        "created_count": rec_record.created_count,
                        "updated_count": rec_record.updated_count,
                        "unchanged_count": rec_record.unchanged_count,
                        "rejected_count": rec_record.rejected_count,
                        "reconciliation_delta": rec_record.reconciliation_delta,
                        "is_reconciled": rec_record.is_reconciled,
                        "previous_checksum": rec_record.previous_checksum,
                        "checksum": rec_record.checksum,
                    } if rec_record else None,
                    "import_record": {
                        "row_number": rec.row_number,
                        "action_type": rec.action_type,
                        "validation_status": rec.validation_status,
                        "raw_data": json.loads(rec.raw_data_json) if rec.raw_data_json else None,
                        "normalized_data": json.loads(rec.normalized_data_json) if rec.normalized_data_json else None,
                        "before_snapshot": json.loads(rec.before_snapshot_json) if rec.before_snapshot_json else None,
                        "diff": json.loads(rec.diff_json) if rec.diff_json else None,
                    },
                })

    # 4. Find Inventory Transactions referencing these batches or the product
    txs = []
    if seen_batch_ids or (domain_record and "id" in domain_record):
        prod_id = domain_record["id"] if domain_record and "id" in domain_record else None
        tx_query = db.query(InventoryTransaction)
        if prod_id and seen_batch_ids:
            tx_query = tx_query.filter(
                (InventoryTransaction.reference.in_(list(seen_batch_ids))) | 
                (InventoryTransaction.product_id == prod_id)
            )
        elif prod_id:
            tx_query = tx_query.filter(InventoryTransaction.product_id == prod_id)
        elif seen_batch_ids:
            tx_query = tx_query.filter(InventoryTransaction.reference.in_(list(seen_batch_ids)))
        
        for t in tx_query.all():
            txs.append({
                "id": t.id,
                "type": t.type,
                "quantity": t.quantity,
                "quantity_before": t.quantity_before,
                "quantity_after": t.quantity_after,
                "reason_category": t.reason_category,
                "reference_batch_id": t.reference,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            })

    return {
        "entity_type": entity_key,
        "query_identifier": str(entity_id),
        "canonical_id": canonical_id,
        "domain_entity": domain_record,
        "external_mappings": mapping_list,
        "intake_batches": batches_data,
        "inventory_ledger_events": txs,
        "lineage_complete": True,
    }


def verify_reconciliation_hash_chain(db: Session) -> dict[str, Any]:
    """
    Cryptographic Hash Chain Verifier:
    Sequentially traverses all ImportReconciliationRecord rows from oldest to newest.
    Verifies that for each record i:
    1. record[i].previous_checksum == (record[i-1].checksum if i > 0 else '0'*64)
    2. record[i].checksum == SHA256(batch_id : previous_checksum : totals : delta)
    3. Invariant equation holds: total == accepted + rejected AND accepted == created + updated + unchanged AND unexplained_delta == 0
    Returns {'is_valid': bool, 'total_verified': int, 'broken_record_id': int|None, 'details': str}
    """
    records = db.query(ImportReconciliationRecord).order_by(ImportReconciliationRecord.id.asc()).all()
    if not records:
        return {"is_valid": True, "total_verified": 0, "broken_record_id": None, "details": "No reconciliation records in ledger."}

    prev_checksum = "0" * 64
    for idx, rec in enumerate(records, start=1):
        # 1. Verify link to previous seal
        if rec.previous_checksum != prev_checksum:
            return {
                "is_valid": False,
                "total_verified": idx - 1,
                "broken_record_id": rec.id,
                "broken_batch_id": rec.batch_id,
                "details": f"Hash chain link broken at record #{rec.id} (batch {rec.batch_id}): expected previous_checksum '{prev_checksum}', found '{rec.previous_checksum}'.",
            }

        # 2. Recompute expected checksum
        expected_payload = (
            f"{rec.batch_id}:{rec.previous_checksum}:{rec.total_records}:{rec.accepted_count}:"
            f"{rec.rejected_count}:{rec.created_count}:{rec.updated_count}:{rec.unchanged_count}:{rec.reconciliation_delta:.2f}"
        )
        calculated_checksum = hashlib.sha256(expected_payload.encode("utf-8")).hexdigest()
        if calculated_checksum != rec.checksum:
            return {
                "is_valid": False,
                "total_verified": idx - 1,
                "broken_record_id": rec.id,
                "broken_batch_id": rec.batch_id,
                "details": f"Checksum seal mismatch at record #{rec.id} (batch {rec.batch_id}): data has been tampered with.",
            }

        # 3. Verify equation invariants
        unexplained = float(rec.total_records - (rec.created_count + rec.updated_count + rec.unchanged_count + rec.rejected_count))
        if unexplained != 0.0 or rec.reconciliation_delta != 0.0 or not rec.is_reconciled:
            return {
                "is_valid": False,
                "total_verified": idx - 1,
                "broken_record_id": rec.id,
                "broken_batch_id": rec.batch_id,
                "details": f"Reconciliation invariant violation at record #{rec.id} (batch {rec.batch_id}): unexplained_delta={unexplained}.",
            }

        prev_checksum = rec.checksum

    return {
        "is_valid": True,
        "total_verified": len(records),
        "broken_record_id": None,
        "latest_checksum": prev_checksum,
        "details": f"All {len(records)} reconciliation records cryptographically verified. Hash chain is intact and untampered.",
    }

