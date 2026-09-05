"""
Enterprise Versioned Template Generation Service:
Dynamically produces versioned CSV and Excel import templates with embedded schema contracts,
canonical headers, format documentation, and sample guidance rows.
"""

import csv
import io
from datetime import UTC, datetime

from app.services.data_dictionary_service import get_contract_for_entity


def generate_csv_template(entity_type: str, include_sample_row: bool = True) -> str:
    """
    Generates a versioned CSV template with standardized canonical headers and metadata comment.
    """
    contract = get_contract_for_entity(entity_type)
    if not contract:
        raise ValueError(f"Unknown entity type for template generation: {entity_type}")

    schema_version = contract["schema_version"]
    fields = contract["fields"]

    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Write Versioned Header Comment
    timestamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    output.write(
        f"# IMS Enterprise Import Template | Entity: {contract['entity_type']} | "
        f"Schema: {schema_version} | Generated: {timestamp}\n"
    )
    output.write(
        "# Rules: Required fields marked (*). Do not alter column names.\n"
    )

    # 2. Field Names (Canonical column headers)
    field_names = [f["field_name"] for f in fields]
    writer.writerow(field_names)

    # 3. Optional Sample Valid Row
    if include_sample_row:
        sample_row = [f.get("example", "") for f in fields]
        writer.writerow(sample_row)

    return output.getvalue()


def extract_template_version_from_content(content: str) -> tuple[str | None, str | None]:
    """
    Extracts (entity_type, schema_version) from template metadata header if present.
    Example header:
    # IMS Enterprise Import Template | Entity: EMPLOYEES | Schema: EMPLOYEE-2.1 | Generated: 2026-09-01
    """
    for line in content.splitlines()[:5]:
        line = line.strip()
        if line.startswith("# IMS Enterprise Import Template"):
            parts = [p.strip() for p in line.split("|")]
            entity_type = None
            schema_version = None
            for part in parts:
                if part.startswith("Entity:"):
                    entity_type = part.replace("Entity:", "").strip().upper()
                elif part.startswith("Schema:"):
                    schema_version = part.replace("Schema:", "").strip().upper()
            return entity_type, schema_version
    return None, None
