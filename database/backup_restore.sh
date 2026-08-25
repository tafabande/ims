#!/bin/bash
# ==============================================================================
# IMS Production Backup & Disaster Recovery (DR) Script
# SLA Targets: RPO = 15 minutes, RTO = 1 hour
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ims}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ims_db_backup_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "========================================================================="
echo " Starting IMS Database Automated Production Backup"
echo " Timestamp: ${TIMESTAMP}"
echo "========================================================================="

# 1. Execute encrypted dump from PostgreSQL container
docker exec ims_postgres pg_dump -U ims_user -d ims_db | gzip > "${BACKUP_FILE}"

# 2. Apply AES-256-CBC Encryption
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "Encrypting backup archive with AES-256..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "${BACKUP_FILE}" -out "${ENCRYPTED_FILE}" -pass pass:"${BACKUP_ENCRYPTION_KEY}"
    rm -f "${BACKUP_FILE}"
    echo "Backup encrypted: ${ENCRYPTED_FILE}"
else
    echo "Backup completed (unencrypted): ${BACKUP_FILE}"
fi

echo "========================================================================="
echo " Disaster Recovery Restoration Verification Checklist"
echo "========================================================================="
echo " To test restoration:"
echo " 1. Stop app traffic: docker-compose stop backend"
echo " 2. Decrypt backup (if encrypted): openssl enc -d -aes-256-cbc -pbkdf2 -in ${ENCRYPTED_FILE:-$BACKUP_FILE} -out restored.sql.gz -pass pass:KEY"
echo " 3. Restore to target Postgres DB: gunzip -c restored.sql.gz | docker exec -i ims_postgres psql -U ims_user -d ims_db"
echo " 4. Run migration validation & start app: docker-compose start backend"
echo "========================================================================="
