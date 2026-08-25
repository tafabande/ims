# Inventory Management System (IMS) — Complete Technical Specification

This document summarizes the architectural, operational, security, and design implementation of the **Inventory Management System (IMS)** across seven software engineering disciplines.

---

## 1. Software Engineering Perspective
- **State vs Audit Trail**: Inventory quantity is maintained per SKU, but every stock-in, stock-out, purchase, or sale creates an immutable entry in `inventory_transactions`.
- **Atomic Operations**: Backend business logic (`inventory_service.py`) encapsulates all sales and purchase arrivals inside atomic database transactions (`BEGIN`, `COMMIT`, `ROLLBACK`).
- **Validation**: Backend stock checks prevent negative inventory balances prior to record insertion.

---

## 2. DevOps Perspective
- **Containerization**: Multi-container setup defined in `docker-compose.yml` (Nginx Frontend, FastAPI Backend, PostgreSQL DB, Adminer DB GUI).
- **CI/CD**: `.github/workflows/ci.yml` automates frontend building, backend dependency installation, and container verification on every commit.
- **Environment Decoupling**: Secrets and credentials managed via `.env.example` and environment variable injection.

---

## 3. Database Administrator (DBA) Perspective
- **Integrity Constraints**: Enforced at schema level via SQL `CHECK (stock_quantity >= 0)`, `CHECK (purchase_price >= 0)`, and `CHECK (selling_price >= 0)`.
- **Foreign Keys**: Cascading definitions (`ON DELETE RESTRICT` for products/categories; `ON DELETE CASCADE` for line items).
- **Indexes**: Indexes placed on `sku`, `barcode`, `category_id`, `product_id`, and `created_at` to ensure sub-millisecond lookup speeds.

---

## 4. IT & Infrastructure Perspective
- **Network Segmentation & Database Isolation**: Public Nginx reverse proxy / WAF routes API traffic (`:443`/`:80`) to FastAPI containers. The PostgreSQL database (`:5432`) is isolated on a private bridge network (`database-net`) with direct public/Internet access strictly denied (`Internet -> PostgreSQL DENY`).
- **Zero-Trust Hybrid Deployment**: Single application codebase supports store LAN (`https://ims.store.local`) and cloud access (`https://ims.example.com`). Network reachability does not equal authorization (`LAN != Trusted`).
- **Hardware Integration**: Barcode/QR labeling simulator formatted for thermal sticker printers and optical scanners.
- **Service Monitoring**: `/health` endpoint exposes real-time database connectivity and runtime status.

---

## 5. Cybersecurity Perspective (CIA Triad & Zero-Trust RBAC)
- **Zero-Trust Contextual Authorization Engine**: Evaluates `Network Context (LAN / REMOTE / ADMIN) + User Identity + Role + Permission Scope`.
  - **LAN Profile**: Full store operational reachability (POS direct terminal sales, receiving, stocktakes). All requests remain authenticated via session JWT tokens.
  - **REMOTE Profile**: Restrictive context. Enables remote inventory viewing, financial reporting, and PO approvals for Managers/Admins, but blocks high-risk POS terminal sales (`sales:create`) for remote staff.
  - **ADMIN Profile**: Restricted system configuration and RBAC control under mandatory audit logging.
- **Input Validation**: Pydantic schema validation rejects malicious inputs and unhandled numeric overflows.
- **Explicit Environment CORS**: Strict origin whitelist (`CORS_ALLOWED_ORIGINS=https://ims.example.com, https://ims.store.local, http://localhost:5173`) prevents unauthorized cross-origin requests.
- **Audit Logging**: `audit_logs` table records operator identity, IP address, network context (`LAN`/`REMOTE`/`ADMIN`), timestamp, and details for every security event.


---

## 6. Design & UX Perspective
- **Dashboard Usability**: Key visual metrics, interactive Recharts sales trends, and real-time low-stock visual pulse alerts.
- **Point of Sale (POS) Workflow**: Instant cart building, stock availability checks, customer selection, and printable Tax Invoice modal.

---

## 7. Project Management Perspective
- **Prioritization (MoSCoW)**:
  - *Must Have*: Authentication, Product Management, Stock Ledger, Purchases, Sales POS, Low-stock Alerts.
  - *Should Have*: Financial Reports, Audit Logging, Printable Invoices, Dark/Light mode.
  - *Out of Scope*: AI Demand Forecasting, Blockchain, IoT drone tracking.
