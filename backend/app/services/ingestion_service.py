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
    ImportBatch,
    ImportRecord,
    InventoryTransaction,
    Product,
    Supplier,
)

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


def parse_csv_or_excel(file_bytes: bytes, filename: str) -> tuple[list[str], list[dict[str, Any]]]:
    """
    Parses CSV or text-based table stream.
    Returns (headers, list of raw row dictionaries).
    """
    text_content = file_bytes.decode("utf-8-sig", errors="replace")
    io_stream = io.StringIO(text_content)
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
) -> dict[str, Any]:
    """
    Core Ingestion & Validation Pipeline:
    1. Calculate SHA-256 hash & check for duplicate import.
    2. Parse CSV / Excel rows.
    3. Apply column mapping & validate field formats, required fields, and business rules.
    4. Block execution if critical validation errors exist.
    5. Save staged records to ImportBatch and ImportRecord tables.
    """
    file_hash = calculate_file_hash(file_bytes)
    file_size = len(file_bytes)
    entity_key = entity_type.lower()

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

        if row_errors:
            row_status = "REJECTED"
            rejected_count += 1
        else:
            valid_count += 1

        staged_records.append(
            {
                "row_number": idx,
                "raw_data_json": json.dumps(raw_row),
                "normalized_data_json": json.dumps(normalized),
                "validation_status": row_status,
                "error_message": " | ".join(row_errors) if row_errors else None,
            }
        )

    batch_status = "VALIDATED" if rejected_count == 0 else "REQUIRES_CORRECTION"

    # Create ImportBatch in DB
    batch = ImportBatch(
        batch_id=batch_code,
        filename=filename,
        file_hash=file_hash,
        file_size=file_size,
        uploader_user_id=uploader_user_id,
        source_type=source_type,
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
            raw_data_json=r["raw_data_json"],
            normalized_data_json=r["normalized_data_json"],
            validation_status=r["validation_status"],
            error_message=r["error_message"],
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
        "is_duplicate": is_duplicate,
        "duplicate_warning_message": duplicate_warning,
        "errors": [
            {"row": r["row_number"], "error": r["error_message"]}
            for r in staged_records
            if r["validation_status"] == "REJECTED"
        ],
    }


def execute_approved_batch(db: Session, batch_id: str, approver_user_id: int) -> ImportBatch:
    """
    Executes a validated/approved staging import batch into core production database tables.
    Adheres to domain validation & rules.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Import batch '{batch_id}' not found.")

    if batch.status in ["IMPORTED"]:
        raise HTTPException(status_code=400, detail=f"Batch '{batch_id}' has already been imported.")

    if batch.rejected_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute batch '{batch_id}' with {batch.rejected_count} validation errors. Fix errors first.",
        )

    entity_key = batch.entity_type.lower()
    records = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).all()

    # Default category fallback for products
    default_cat = db.query(Category).first()
    if not default_cat:
        default_cat = Category(name="General Supplies", code="GEN-001", category_code="CAT-000001")
        db.add(default_cat)
        db.flush()

    for rec in records:
        if rec.validation_status != "VALID":
            continue

        normalized = json.loads(rec.normalized_data_json or "{}")

        if entity_key == "products":
            sku = normalized.get("sku")
            existing = db.query(Product).filter(Product.sku == sku).first()
            if existing:
                existing.name = normalized.get("name", existing.name)
                existing.purchase_price = float(normalized.get("purchase_price", existing.purchase_price))
                existing.selling_price = float(normalized.get("selling_price", existing.selling_price))
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
                rec.imported_entity_id = str(p.id)

        elif entity_key == "employees":
            emp_code = normalized.get("employee_code")
            existing = db.query(Employee).filter(Employee.employee_code == emp_code).first()
            if not existing:
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
                rec.imported_entity_id = str(emp.id)

        elif entity_key == "suppliers":
            s_name = normalized.get("name")
            sup = db.query(Supplier).filter(Supplier.name == s_name).first()
            if not sup:
                sup = Supplier(
                    name=s_name,
                    contact_person=normalized.get("contact_person"),
                    email=normalized.get("email"),
                    phone=normalized.get("phone"),
                    address=normalized.get("address"),
                )
                db.add(sup)
                db.flush()
            rec.imported_entity_id = str(sup.id)

        elif entity_key == "customers":
            c_name = normalized.get("name")
            cust = db.query(Customer).filter(Customer.name == c_name).first()
            if not cust:
                cust = Customer(
                    name=c_name,
                    email=normalized.get("email"),
                    phone=normalized.get("phone"),
                )
                db.add(cust)
                db.flush()
            rec.imported_entity_id = str(cust.id)

        elif entity_key == "opening_stock":
            sku = normalized.get("sku")
            qty = int(normalized.get("quantity", 0))
            prod = db.query(Product).filter(Product.sku == sku).first()
            if prod:
                before = prod.stock_quantity
                prod.stock_quantity += qty
                db.flush()
                # Record Inventory Transaction
                tx = InventoryTransaction(
                    product_id=prod.id,
                    type="RECEIVE",
                    quantity=qty,
                    quantity_before=before,
                    quantity_after=prod.stock_quantity,
                    reason_category="OPENING_STOCK_IMPORT",
                    reference=batch_id,
                    notes=f"Opening stock imported via batch {batch_id}",
                )
                db.add(tx)
                rec.imported_entity_id = str(prod.id)

    batch.status = "IMPORTED"
    batch.approved_at = datetime.now(UTC)
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


def approve_import_batch(db: Session, batch_id: str, approver_user_id: int | None = None) -> ImportBatch:
    """Manager approval wrapper for execute_approved_batch."""
    return execute_approved_batch(db, batch_id, approver_user_id or 1)
