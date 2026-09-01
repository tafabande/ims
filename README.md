# 📦 Enterprise Inventory Management System (IMS)

An enterprise-grade, production-oriented **Inventory Management System (IMS)** built with **FastAPI**, **SQLModel / SQLAlchemy**, **PostgreSQL**, **Redis**, **Nginx**, and **React + Vite**.

Designed for high-throughput retail, warehouse operations, multi-location stock tracking, cash reconciliation, and strict separation-of-duties (SoD) escalation workflows.

---

## 🚀 Quick Start (1-Click Launch)

### Windows
Double-click `1-CLICK-START.bat` in the project root directory.

### Linux / macOS
```bash
chmod +x 1-click-start.sh && ./1-click-start.sh
```

The launcher automatically detects your environment (Docker vs Local Virtualenv), starts PostgreSQL and Redis containers, seeds default data, and opens the application web interface:
* **Production Gateway (Docker/Nginx):** [http://localhost](http://localhost)
* **Local Frontend Development:** [http://localhost:5173](http://localhost:5173)
* **API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Pre-Seeded Test Credentials

| Role | Login Email | Default Password | Operational Scope |
| :--- | :--- | :--- | :--- |
| **Store Manager** | `manager@ims.co.zw` | `manager123` | Operational cases approval, price overrides, shift management, financial reports |
| **Front Cashier** | `staff@ims.co.zw` | `staff123` | POS register checkout, receipts, return requests, float reconciliation |
| **Warehouse Specialist** | `warehouse@ims.co.zw` | `warehouse123` | Goods receiving (GRN), inter-store stock transfers, stocktakes |
| **System Admin** | `admin@ims.co.zw` | `admin123` | User provision, system configuration, backup management |
| **Compliance Auditor** | `auditor@ims.co.zw` | `auditor123` | Ledger audit inspection, double-entry reconciliation |

---

## 🏗️ Architecture & Technology Stack

```
                                  ┌──────────────────┐
                                  │  Nginx Gateway   │
                                  │    (Port 80)     │
                                  └────────┬─────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
          ┌──────────────────┐                          ┌──────────────────┐
          │  React + Vite    │                          │ FastAPI Backend  │
          │     Frontend     │                          │   (Port 8000)    │
          └──────────────────┘                          └────────┬─────────┘
                                                                 │
                                           ┌─────────────────────┴─────────────────────┐
                                           ▼                                           ▼
                                ┌────────────────────┐                       ┌────────────────────┐
                                │ PostgreSQL 16 DB   │                       │    Redis 7 Cache   │
                                │ (ACID + MVCC + WAL)│                       │  (Cache-Aside API) │
                                └────────────────────┘                       └────────────────────┘
```

* **Backend Framework:** FastAPI (Python 3.12+)
* **Database & ORM:** PostgreSQL 16 + SQLModel / SQLAlchemy
* **Database Migrations:** Alembic
* **Caching & Session Store:** Redis 7 (Alpine)
* **Reverse Proxy / SSL:** Nginx
* **Containerization:** Docker & Docker Compose
* **Frontend UI:** React 18, Vite, Tailwind CSS / Vanilla CSS, Lucide Icons

---

## 🗄️ Database Architecture & Engineering Principles

* **Strong ACID Compliance:** Strict transaction boundaries on all financial & inventory mutations (Sales, Returns, Goods Receiving, Stock Adjustments).
* **Double-Entry Ledger Accounting:** Every inventory change creates an immutable [`InventoryTransaction`](file:///c:/Users/User/Desktop/ims/backend/app/models.py#L241) row recording `quantity_before` and `quantity_after` snapshots.
* **Deterministic Row Locking:** Pessimistic `.with_for_update()` queries sort product IDs numerically prior to lock acquisition to eliminate database deadlocks.
* **PostgreSQL Row-Level Security (RLS):** Session variables (`app.location_id`, `app.org_id`) set via PostgreSQL `set_config` for strict multi-tenant isolation.
* **Automated Encrypted Backups:** Automated `pg_dump` compressed backups created every 15 minutes, AES-256 encrypted, with automatic S3 uploading capability.

---

## 📁 Repository Structure

```text
ims/
├── backend/                  # FastAPI Application & Services
│   ├── alembic/              # Alembic Database Migrations
│   ├── app/
│   │   ├── middleware/       # RBAC, Rate Limiting, Idempotency, Security Headers
│   │   ├── routes/           # REST API Route Endpoints
│   │   ├── services/         # Core Business Logic & Inventory Engines
│   │   ├── database.py       # SQLAlchemy Connection Pooling & RLS Setup
│   │   ├── models.py         # Domain Data Schemas & Constraints
│   │   └── main.py           # FastAPI Application Entrypoint
│   ├── tests/                # Pytest Test Suites (119 test cases)
│   └── seed.py               # Database Seeding Script
├── frontend/                 # React + Vite Single Page Application
│   └── src/
│       ├── components/       # Reusable UI Controls & Modals
│       ├── pages/            # Application Views (POS, Workbench, Inventory, Cases)
│       └── utils/            # Axios API Client & Authentication Context
├── database/                 # SQL Schemas, MERMAID ERDs, & Backup Scripts
├── docs/                     # Architectural Specifications & Security Matrices
├── docker-compose.yml        # Production Docker Container Stack
├── 1-CLICK-START.bat         # Windows One-Click Launcher
└── 1-click-start.sh          # Linux/macOS Launcher
```

---

## 🧪 Running Automated Tests

```bash
cd backend
python -m pytest
```

---

## 📄 Documentation Links

* [Pre-Production Audit & Verification Checklist](file:///c:/Users/User/Desktop/ims/docs/PRE_PRODUCTION_AUDIT_CHECKLIST.md)
* [Production Deployment Guide](file:///c:/Users/User/Desktop/ims/docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
* [Easy Setup & Non-Technical Client Guide](file:///c:/Users/User/Desktop/ims/EASY_SETUP_GUIDE.md)
* [Database Architecture Audit Report](file:///c:/Users/User/.gemini/antigravity-ide/brain/a511d7cc-c5fc-461b-a66b-53d905404012/database_architecture_audit.md)
* [System Specification Document](file:///c:/Users/User/Desktop/ims/docs/SYSTEM_SPECIFICATION.md)
* [Role & Security Permission Matrix](file:///c:/Users/User/Desktop/ims/docs/5_ROLE_SECURITY_MATRIX.md)
* [Production Readiness Assessment](file:///c:/Users/User/Desktop/ims/docs/PRODUCTION_READINESS_MATRIX.md)
