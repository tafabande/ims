# 5-Role Security & Separation of Duties (SoD) Matrix

> **Core Architectural Principle**: *A person who administers the IT infrastructure or application system is not automatically authorized to alter business inventory or process financial transactions.*

---

## 1. Primary Role Architecture

| Role | Domain Scope | Business Authority | System Administration |
|---|---|:---:|:---:|
| **System Administrator** (`SYSADMIN`) | Infrastructure, OS, Docker, PostgreSQL, Nginx, TLS, Backups | ❌ **DENIED** | ✅ **FULL Infrastructure** |
| **Application Administrator** (`APP_ADMIN`) | IAM, Users, Roles, Security Policies, System Config | ⚠️ **Controlled / Config Only** | ✅ **FULL Application** |
| **Store Manager** (`MANAGER`) | Branch Operations, Catalog, POs, Transfers, Overrides | ✅ **EXTENSIVE** | ❌ **DENIED** |
| **Store Staff** (`STAFF`) | Counter POS Terminal, Stock Adjustments, Shifts/Till, Returns | ✅ **LIMITED Operational** | ❌ **DENIED** |
| **Auditor** (`AUDITOR`) | Independent Audit Compliance, Security Logs, Ledgers, Reports | 👁️ **READ-ONLY** | ❌ **DENIED** |

---

## 2. Granular Domain Permission Matrix

### Legend
- ✅ = Allowed
- ⚠️ = Allowed with restrictions / approval
- 👁️ = Read-only
- ❌ = Denied
- 🔐 = Elevated / Admin authorization required

---

### A. Products & Catalog

| Action | SysAdmin | AppAdmin | Manager | Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| View Products | ❌ | ✅ | ✅ | ✅ | 👁️ |
| Create Product | ❌ | ✅ | ✅ | ❌ | ❌ |
| Edit Product | ❌ | ✅ | ✅ | ❌ | ❌ |
| Delete/Archive Product | ❌ | 🔐 | ⚠️ | ❌ | ❌ |
| Manage Categories | ❌ | ✅ | ✅ | ❌ | 👁️ |

---

### B. Inventory & Ledger Operations

| Action | SysAdmin | AppAdmin | Manager | Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| View Stock Ledger | ❌ | 👁️ | ✅ | 👁️ | 👁️ |
| Record Stock Adjustment | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| Stock In / Receive | ❌ | ❌ | ✅ | ✅ | ❌ |
| Stock Transfers | ❌ | ❌ | ✅ | ❌ | 👁️ |
| Reverse Stock Transaction | ❌ | 🔐 | ⚠️ | ❌ | ❌ |
| Delete Inventory Transaction | ❌ | ❌ | ❌ | ❌ | ❌ |

> ⚠️ **Immutable Ledger Requirement**: Hard deletion of inventory transactions is strictly forbidden (`DELETE FROM transactions`). Errors MUST be corrected via signed reversal entries (`REVERSAL` transaction).

---

### C. Sales & POS Terminal

| Action | SysAdmin | AppAdmin | Manager | Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| View Sales Records | ❌ | 👁️ | ✅ | 👁️ | 👁️ |
| Process POS Sale | ❌ | ❌ | ✅ | ✅ | ❌ |
| Cancel Unsubmitted Cart | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| Refund / Void Sale | ❌ | ⚠️ | 🔐 | ❌ | ❌ |
| Price / Discount Override | ❌ | ❌ | ✅ | ⚠️ | ❌ |

---

### D. Purchasing & Supply Chain

| Action | SysAdmin | AppAdmin | Manager | Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| View Suppliers | ❌ | 👁️ | ✅ | 👁️ | 👁️ |
| Manage Suppliers | ❌ | ✅ | ✅ | ❌ | ❌ |
| Create Purchase Order (PO) | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| Approve Purchase Order | ❌ | ⚠️ | 🔐 | ❌ | ❌ |
| Receive Goods against PO | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| Close PO | ❌ | ❌ | 🔐 | ❌ | 👁️ |

---

### E. User Accounts & Security Control

| Action | SysAdmin | AppAdmin | Manager | Staff | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| View Users & Roles | ❌ | ✅ | ❌ | ❌ | 👁️ |
| Provision User Account | ❌ | 🔐 | ❌ | ❌ | ❌ |
| Assign Roles & Scope | ❌ | 🔐 | ❌ | ❌ | ❌ |
| Reset Credentials / MFA | ❌ | 🔐 | ❌ | ❌ | ❌ |
| View Security Audit Logs | ❌ | ✅ | 👁️ (Scoped) | ❌ | ✅ |
| Delete / Edit Audit Logs | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Manager Override Governance

Managers possess operational override authority for store exceptions, but **zero authority** over system security architecture:

```text
ALLOWED MANAGER OVERRIDES
├── Discount threshold override
├── Stock adjustment approval
├── PO approval
└── Stock transfer authorization

FORBIDDEN MANAGER OVERRIDES
├── Modify user roles / grant admin
├── Alter RBAC scope
├── Edit or delete audit logs
└── Modify JWT or database settings
```

---

## 4. SysAdmin Infrastructure Boundary

The **System Administrator** operates strictly outside the business application boundary:

```text
SYSADMIN CAN:
├── Restart Docker containers & Nginx
├── Maintain PostgreSQL availability & backups
├── Monitor server CPU / RAM / Storage
└── Rotate TLS certificates

SYSADMIN CANNOT:
├── Access or view business inventory/invoices
├── Issue refunds or create products
├── Approve purchase orders
└── Alter application user permissions
```
