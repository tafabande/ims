"""Add Enterprise Installation and Intake Reconciliation Records

Revision ID: 003_enterprise_and_intake
Revises: 002_add_composite_indexes
Create Date: 2026-09-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_enterprise_and_intake"
down_revision: Union[str, None] = "002_add_composite_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. enterprise_installations
    op.create_table(
        "enterprise_installations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("installation_id", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="BOOTSTRAP_PENDING", nullable=False),
        sa.Column("bootstrap_token_hash", sa.String(length=128), nullable=True),
        sa.Column("initialized_at", sa.DateTime(), nullable=True),
        sa.Column("initialized_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("bootstrap_consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_enterprise_installations_id", "enterprise_installations", ["id"], unique=False)
    op.create_index("ix_enterprise_installations_installation_id", "enterprise_installations", ["installation_id"], unique=True)

    # 2. Add columns to import_batches
    with op.batch_alter_table("import_batches") as batch_op:
        batch_op.add_column(sa.Column("content_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("approved_content_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("source_system", sa.String(length=100), server_default="LOCAL_UPLOAD", nullable=True))
        batch_op.add_column(sa.Column("schema_version", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("source_reference", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("risk_level", sa.String(length=20), server_default="LOW", nullable=True))
        batch_op.add_column(sa.Column("created_records_count", sa.Integer(), server_default="0", nullable=True))
        batch_op.add_column(sa.Column("updated_records_count", sa.Integer(), server_default="0", nullable=True))
        batch_op.add_column(sa.Column("unchanged_records_count", sa.Integer(), server_default="0", nullable=True))
        batch_op.add_column(sa.Column("case_id", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("reconciliation_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("reconciliation_delta", sa.Float(), server_default="0.0", nullable=True))

    # 3. Add columns to import_records
    with op.batch_alter_table("import_records") as batch_op:
        batch_op.add_column(sa.Column("external_id", sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column("canonical_id", sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column("action_type", sa.String(length=50), server_default="CREATE", nullable=True))
        batch_op.add_column(sa.Column("before_snapshot_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("diff_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("error_details_json", sa.Text(), nullable=True))
        batch_op.create_index("ix_import_records_external_id", ["external_id"], unique=False)
        batch_op.create_index("ix_import_records_canonical_id", ["canonical_id"], unique=False)

    # 4. import_reconciliation_records
    op.create_table(
        "import_reconciliation_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.String(length=50), sa.ForeignKey("import_batches.batch_id"), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("source_system", sa.String(length=100), nullable=False),
        sa.Column("total_records", sa.Integer(), nullable=False),
        sa.Column("accepted_count", sa.Integer(), nullable=False),
        sa.Column("rejected_count", sa.Integer(), nullable=False),
        sa.Column("created_count", sa.Integer(), nullable=False),
        sa.Column("updated_count", sa.Integer(), nullable=False),
        sa.Column("unchanged_count", sa.Integer(), nullable=False),
        sa.Column("reconciliation_delta", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("is_reconciled", sa.Boolean(), server_default="1", nullable=True),
        sa.Column("previous_checksum", sa.String(length=64), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_import_reconciliation_records_id", "import_reconciliation_records", ["id"], unique=False)
    op.create_index("ix_import_reconciliation_records_batch_id", "import_reconciliation_records", ["batch_id"], unique=False)

    # 5. external_entity_mappings
    op.create_table(
        "external_entity_mappings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("internal_code", sa.String(length=100), nullable=False),
        sa.Column("source_system", sa.String(length=100), nullable=False),
        sa.Column("external_id", sa.String(length=150), nullable=False),
        sa.Column("is_locked", sa.Boolean(), server_default="0", nullable=True),
        sa.Column("remapping_audit_json", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_type", "source_system", "external_id", name="uq_external_entity_mapping"),
    )
    op.create_index("ix_external_entity_mappings_id", "external_entity_mappings", ["id"], unique=False)
    op.create_index("ix_external_entity_mappings_entity_type", "external_entity_mappings", ["entity_type"], unique=False)
    op.create_index("ix_external_entity_mappings_internal_code", "external_entity_mappings", ["internal_code"], unique=False)
    op.create_index("ix_external_entity_mappings_source_system", "external_entity_mappings", ["source_system"], unique=False)
    op.create_index("ix_external_entity_mappings_external_id", "external_entity_mappings", ["external_id"], unique=False)

    # 6. external_entity_mapping_histories
    op.create_table(
        "external_entity_mapping_histories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("mapping_id", sa.Integer(), sa.ForeignKey("external_entity_mappings.id"), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("source_system", sa.String(length=100), nullable=False),
        sa.Column("external_id", sa.String(length=150), nullable=False),
        sa.Column("old_internal_code", sa.String(length=100), nullable=True),
        sa.Column("new_internal_code", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_external_entity_mapping_histories_id", "external_entity_mapping_histories", ["id"], unique=False)
    op.create_index("ix_external_entity_mapping_histories_mapping_id", "external_entity_mapping_histories", ["mapping_id"], unique=False)


def downgrade() -> None:
    op.drop_table("external_entity_mapping_histories")
    op.drop_table("external_entity_mappings")
    op.drop_table("import_reconciliation_records")
    with op.batch_alter_table("import_records") as batch_op:
        batch_op.drop_index("ix_import_records_canonical_id")
        batch_op.drop_index("ix_import_records_external_id")
        batch_op.drop_column("error_details_json")
        batch_op.drop_column("diff_json")
        batch_op.drop_column("before_snapshot_json")
        batch_op.drop_column("action_type")
        batch_op.drop_column("canonical_id")
        batch_op.drop_column("external_id")
    with op.batch_alter_table("import_batches") as batch_op:
        batch_op.drop_column("reconciliation_delta")
        batch_op.drop_column("reconciliation_json")
        batch_op.drop_column("case_id")
        batch_op.drop_column("unchanged_records_count")
        batch_op.drop_column("updated_records_count")
        batch_op.drop_column("created_records_count")
        batch_op.drop_column("risk_level")
        batch_op.drop_column("source_reference")
        batch_op.drop_column("schema_version")
        batch_op.drop_column("source_system")
        batch_op.drop_column("approved_content_hash")
        batch_op.drop_column("content_hash")
    op.drop_table("enterprise_installations")
