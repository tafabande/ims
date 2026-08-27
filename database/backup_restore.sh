#!/bin/bash
# ==============================================================================
# Enterprise IMS — Automated Production Backup & Disaster Recovery (DR) Engine
# SLA Targets: RPO ≤ 15 minutes, RTO ≤ 60 minutes
# Compliance: ISO/IEC 27001 & Enterprise Continuity Standard
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ims}"
CONTAINER_NAME="${CONTAINER_NAME:-ims_postgres}"
POSTGRES_USER="${POSTGRES_USER:-ims_user}"
POSTGRES_DB="${POSTGRES_DB:-ims_db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ims_db_backup_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

mkdir -p "${BACKUP_DIR}"

echo "========================================================================="
echo " Starting Enterprise IMS Automated Database Backup"
echo " Target Container : ${CONTAINER_NAME}"
echo " Database Name    : ${POSTGRES_DB}"
echo " Timestamp        : ${TIMESTAMP}"
echo " SLA Targets      : RPO ≤ 15m | RTO ≤ 60m"
echo "========================================================================="

# 1. Execute SQL dump with schema & data integrity from PostgreSQL container
if ! docker exec "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${BACKUP_FILE}"; then
    echo "ERROR: PostgreSQL database backup dump failed!" >&2
    exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup Dump Completed Successfully. Size: ${BACKUP_SIZE}"

# 2. Apply AES-256-CBC Encryption (if BACKUP_ENCRYPTION_KEY is provided)
FINAL_FILE="${BACKUP_FILE}"
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "Encrypting backup archive with AES-256-CBC (PBKDF2)..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "${BACKUP_FILE}" -out "${ENCRYPTED_FILE}" -pass pass:"${BACKUP_ENCRYPTION_KEY}"
    rm -f "${BACKUP_FILE}"
    FINAL_FILE="${ENCRYPTED_FILE}"
    echo "Encrypted Archive Created: ${FINAL_FILE}"
else
    echo "Notice: BACKUP_ENCRYPTION_KEY not set. Archive stored unencrypted."
fi

# 3. Retention Lifecycle Policy: Purge backups older than RETENTION_DAYS
echo "Applying Retention Policy (Purging backups older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "ims_db_backup_*" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "========================================================================="
echo " Backup Completed Successfully!"
echo " Output File: ${FINAL_FILE}"
echo "========================================================================="
echo ""
echo "Disaster Recovery Restoration Instructions:"
echo "-------------------------------------------------------------------------"
echo "1. Stop Application Traffic:"
echo "   docker compose stop backend"
echo ""
echo "2. Decrypt Archive (if encrypted):"
echo "   openssl enc -d -aes-256-cbc -pbkdf2 -in ${FINAL_FILE} -out /tmp/restored.sql.gz -pass pass:\$BACKUP_ENCRYPTION_KEY"
echo ""
echo "3. Restore Database:"
echo "   gunzip -c /tmp/restored.sql.gz | docker exec -i ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
echo ""
echo "4. Restart Application Stack:"
echo "   docker compose start backend"
echo "========================================================================="
