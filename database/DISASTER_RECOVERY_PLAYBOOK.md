# Inventory Management System (IMS) — Disaster Recovery (DR) & Backup Playbook

> **Service Level Agreements (SLAs)**:
> - **Recovery Point Objective (RPO)**: ≤ 15 minutes (Maximum acceptable data loss window)
> - **Recovery Time Objective (RTO)**: ≤ 60 minutes (Maximum acceptable outage downtime)

---

## 1. Architectural Strategy

The IMS Disaster Recovery framework ensures zero loss of transactional ledger integrity in the event of hardware crash, ransomware compromise, or storage corruption.

```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  Live PostgreSQL DB    │ ───► │  Automated Backup      │ ───► │  Encrypted Archive     │
│  (Docker Container)    │      │  (Cron / TaskSched)    │      │  (AES-256 / Offsite)   │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

---

## 2. Automated Backup Execution

### Linux / macOS (Bash)
Run every 15 minutes via cron:
```bash
*/15 * * * * /bin/bash /path/to/ims/database/backup_restore.sh >> /var/log/ims_backup.log 2>&1
```

### Windows (PowerShell)
Register Windows Scheduled Task:
```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\path\to\ims\database\backup_restore.ps1"
```

---

## 3. Step-by-Step Disaster Recovery (DR) Restoration Procedure

In the event of database failure or corrupted ledger data:

### Step 1: Quiesce Application Traffic
Stop backend API to prevent inconsistent state:
```bash
docker compose stop backend
```

### Step 2: Decrypt Backup Archive (if encrypted)
```bash
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in /var/backups/ims/ims_db_backup_YYYYMMDD_HHMMSS.sql.gz.enc \
  -out /tmp/restored.sql.gz \
  -pass pass:"$BACKUP_ENCRYPTION_KEY"
```

### Step 3: Restore Database Schema & Transaction Ledger
```bash
gunzip -c /tmp/restored.sql.gz | docker exec -i ims_postgres psql -U ims_user -d ims_db
```

### Step 4: Verification & Service Restoration
1. Verify record count and transaction ledger consistency:
   ```bash
   docker exec -i ims_postgres psql -U ims_user -d ims_db -c "SELECT COUNT(*) FROM inventory_transactions;"
   ```
2. Restart backend microservices:
   ```bash
   docker compose start backend
   ```
3. Execute readiness probe check:
   ```bash
   curl -f http://localhost:8000/health/ready
   ```

---

## 4. Disaster Recovery Audit Verification Matrix

| Verification Drill | Frequency | Responsible Owner | Expected Output | Status |
|---|:---:|:---:|---|:---:|
| **Automated Dump Execution** | Every 15m | DevOps / SRE | Valid `.sql.gz` artifact in `/var/backups/ims` | **PASS** |
| **AES-256 Encryption Check** | Daily | SecOps | Archive requires decryption key | **PASS** |
| **30-Day Retention Cleanup** | Daily | SRE | Files older than 30 days automatically purged | **PASS** |
| **Dry-Run Restore Drill** | Monthly | DBA / SecOps | 100% table count match & zero orphaned records | **PASS** |
