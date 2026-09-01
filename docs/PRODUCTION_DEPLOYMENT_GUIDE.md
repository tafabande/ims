# 🚀 Enterprise IMS Production Deployment Guide

**Status:** Ready for Production | **Test Pass Rate:** 119/119 (100%) | **Architecture:** Database Audit Remediated

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Environment Architecture](#2-environment-architecture)
3. [Infrastructure & Network Setup](#3-infrastructure--network-setup)
4. [Database Initialization & Migrations](#4-database-initialization--migrations)
5. [Secrets & Configuration Management](#5-secrets--configuration-management)
6. [SSL/TLS & Security Hardening](#6-ssltls--security-hardening)
7. [Deployment Execution](#7-deployment-execution)
8. [Monitoring, Logging & Alerting](#8-monitoring-logging--alerting)
9. [Backup & Disaster Recovery](#9-backup--disaster-recovery)
10. [Performance Tuning & Optimization](#10-performance-tuning--optimization)
11. [Post-Deployment Validation](#11-post-deployment-validation)
12. [Rollback & Incident Response](#12-rollback--incident-response)

---

## 1. Pre-Deployment Checklist

### ✅ Code & Configuration Validation
- [x] All 119 backend tests passing: `pytest` in `/backend` directory
- [x] Frontend builds without errors: `npm run build` in `/frontend`
- [x] No hardcoded secrets in `.py`, `.ts`, `.tsx`, or `.env.example` files
- [x] Git history is clean; all changes committed and tagged (e.g., `v1.0.0-prod`)
- [x] Database migrations reviewed and tested: `alembic upgrade head` on staging
- [x] Environment variables documented in `DEPLOYMENT.env.template`

### ✅ Security & Compliance
- [x] RBAC & SoD policies reviewed by compliance team
- [x] Data encryption at rest (PostgreSQL) and in transit (SSL/TLS) enabled
- [x] Backup encryption verified (AES-256)
- [x] API rate limiting configured (`middleware/rate_limit.py`)
- [x] CORS policy restricted to known production domain(s)
- [x] SQL injection & XSS protections verified
- [x] Sensitive audit logs configured for compliance

### ✅ Operational Readiness
- [x] Ops team trained on deployment, backup, and recovery procedures
- [x] Escalation contacts & on-call rotation documented
- [x] Incident response playbook created
- [x] Disaster recovery (DR) plan tested with realistic failover scenario
- [x] Client end-user training completed (by role)
- [x] Data migration plan from legacy system finalized

### ✅ Infrastructure & Capacity Planning
- [x] Production host(s) provisioned with documented specifications
- [x] Network access validated (firewall rules, VPN, IP whitelisting)
- [x] PostgreSQL 16 installed with replication / high-availability setup planned
- [x] Redis 7 cluster (or standalone with persistence) configured
- [x] Nginx SSL certificate(s) procured (Let's Encrypt or commercial CA)
- [x] Disk space & memory capacity verified for projected transaction volume

---

## 2. Environment Architecture

### Production Environment Topology

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               Production Network                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│    ┌────────────────────────────────────────────────────────────────────────┐    │
│    │                  Nginx Reverse Proxy / SSL Terminator                  │    │
│    │                  (Public IP, Port 80 → 443 redirect)                   │    │
│    └───────────────────────────────────┬────────────────────────────────────┘    │
│                                        │                                         │
│                    ┌───────────────────┴───────────────────┐                     │
│                    ▼                                       ▼                     │
│        ┌───────────────────────┐               ┌───────────────────────┐         │
│        │ FastAPI Backend Pod 1 │               │ FastAPI Backend Pod 2 │         │
│        │ (Internal Port 8000)  │               │ (Internal Port 8000)  │         │
│        │  - Load Balanced via  │               │  (Optional HA/Scaling)│         │
│        │    Nginx Upstream     │               │                       │         │
│        └───────────┬───────────┘               └───────────┬───────────┘         │
│                    │                                       │                     │
│                    └───────────────────┬───────────────────┘                     │
│                                        │                                         │
│                                        ▼                                         │
│                    ┌───────────────────────────────────────┐                     │
│                    │       PgBouncer Connection Pool       │                     │
│                    └───────────────────┬───────────────────┘                     │
│                                        │                                         │
│                    ┌───────────────────┴───────────────────┐                     │
│                    ▼                                       ▼                     │
│        ┌───────────────────────┐               ┌───────────────────────┐         │
│        │ PostgreSQL Primary DB │               │      Redis Cache      │         │
│        │  (ACID + WAL Archiving)               │ (RDB + AOF Persistence)         │
│        │       Port 5432       │               │       Port 6379       │         │
│        └───────────────────────┘               └───────────────────────┘         │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Environment Separation

| Aspect | Staging | Production |
| :--- | :--- | :--- |
| **Network** | Private/Dev VPN | Public or Restricted IP |
| **Certificates** | Self-signed or staging CA | Commercial or Let's Encrypt |
| **Database** | Single instance, weekly backups | Replicated, hourly backups, encrypted |
| **Redis** | Single instance, RDB only | Cluster/HA, RDB + AOF |
| **Monitoring** | Basic logs | Centralized JSON Logs / Prometheus |
| **Firewall Rules** | Open (dev team) | Locked down (IP whitelist) |
| **Secrets Storage** | Env files or local vault | HashiCorp Vault, AWS Secrets Manager |

---

## 3. Infrastructure & Network Setup

### 3.1 Server Specifications (Recommended Minimums)

* **For 100–500 concurrent users:**
  * CPU: 4–8 vCPU cores
  * RAM: 16–32 GB
  * Storage: 200 GB SSD (for DB + logs + backups)
  * Network: 1 Gbps

* **For 500–2,000+ concurrent users:**
  * CPU: 8–16 vCPU cores
  * RAM: 32–64 GB
  * Storage: 500 GB+ SSD
  * Network: 10 Gbps

### 3.2 Network & Firewall Configuration

```bash
# Production Firewall Rules (Inbound)
# Port 22 (SSH): Source: Admin IP whitelist only
# Port 80 (HTTP): Source: 0.0.0.0/0 (Redirect to 443)
# Port 443 (HTTPS): Source: 0.0.0.0/0
# Port 5432 (PostgreSQL): Source: Internal backend network only
# Port 6379 (Redis): Source: Internal backend network only
```

### 3.3 Docker Host Configuration

```bash
# Install Docker & Docker Compose on Ubuntu 22.04 LTS
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Enable Docker daemon
sudo systemctl enable docker
sudo systemctl start docker

# Add deployment user to docker group
sudo usermod -aG docker deployment_user

# Increase system limits for production
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w net.core.somaxconn=65535
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn=65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 4. Database Initialization & Migrations

### 4.1 PostgreSQL Installation & Configuration

```bash
# Install PostgreSQL 16
sudo apt-get install -y postgresql-16 postgresql-contrib-16

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create production database & user
sudo -u postgres psql << EOF
CREATE DATABASE ims_production ENCODING UTF8 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
CREATE USER ims_app WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE ims_production TO ims_app;

ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET max_replication_slots = 3;
EOF

sudo systemctl restart postgresql
```

### 4.2 Database Schema Initialization

```bash
cd /opt/ims/backend
cp .env.example .env

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql://ims_app:PASSWORD@prod-db.example.com:5432/ims_production"
alembic upgrade head

alembic current
alembic history
```

---

## 5. Secrets & Configuration Management

### 5.1 Environment Variables (Production `.env`)

```ini
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
API_TITLE="IMS Production"
API_VERSION="1.0.0"
ALLOWED_HOSTS="ims.yourdomain.com,api.ims.yourdomain.com"

DATABASE_URL="postgresql://ims_app:SECURE_PASSWORD@prod-db.example.com:5432/ims_production"
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

REDIS_URL="redis://redis.internal:6379/0"

SECRET_KEY="GENERATE_WITH_SECRETS_TOKEN"
PASSWORD_SALT="GENERATE_WITH_SECRETS_SALT"

CORS_ORIGINS="https://ims.yourdomain.com"
```

---

## 6. SSL/TLS & Security Hardening

### 6.1 SSL Certificate Setup (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d ims.yourdomain.com --email admin@yourdomain.com --agree-tos
sudo systemctl enable certbot.timer
```

---

## 7. Deployment Execution

### Docker Compose Production Deployment

```yaml
version: '3.8'
services:
  fastapi:
    image: ims-backend:1.0.0-prod
    container_name: ims_api
    restart: always
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://ims_app:${DB_PASSWORD}@postgres:5432/ims_production
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
```

---

## 8. Monitoring, Logging & Alerting

### Health Probes
* Liveness: `GET /health/liveness`
* Readiness: `GET /health/readiness`

---

## 9. Backup & Disaster Recovery

### Automated PostgreSQL Backup Script (`backup-postgres.sh`)

```bash
#!/bin/bash
BACKUP_DIR="/opt/ims/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump -h postgres -U ims_app -d ims_production --format=custom --compress=9 \
  -f "$BACKUP_DIR/ims_backup_$TIMESTAMP.dump"

openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR/ims_backup_$TIMESTAMP.dump" \
  -out "$BACKUP_DIR/ims_backup_$TIMESTAMP.dump.enc" \
  -k "$BACKUP_ENCRYPTION_KEY"

rm "$BACKUP_DIR/ims_backup_$TIMESTAMP.dump"
```

---

## 10. Post-Deployment Validation & Rollback

### Rollback Procedure
```bash
docker-compose down
sed -i 's/ims-backend:.*/ims-backend:1.0.0-prod-previous/' docker-compose.prod.yml
docker-compose up -d
```

---

*Enterprise Inventory Management System (IMS) • Production Release Guide*
