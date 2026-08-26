# 🚀 Non-Technical Client Quick-Start Guide (IMS System)

Welcome to the **Inventory Management System (IMS)**! This guide is specially designed for client store managers, non-technical IT administrators, and staff.

You do **NOT** need any programming or command-line knowledge to set up and run this application.

---

## ⚡ How to Start the System in 1 Double-Click

### On Windows:
1. Open the project folder on your computer (`ims`).
2. Double-click the file named **`1-CLICK-START.bat`**.
3. A green terminal screen will open automatically, and your default web browser (Chrome/Edge/Firefox) will open directly to the application homepage:
   - **Production Mode (Docker)**: `http://localhost`
   - **Local Mode**: `http://localhost:5173`

### On Mac or Linux:
1. Open terminal in the `ims` folder.
2. Run `chmod +x 1-click-start.sh && ./1-click-start.sh` (or double-click `1-click-start.sh`).

---

## 🔐 Default Login Accounts & Sample Data

The application comes pre-loaded with comprehensive sample products (Laptops, Accessories, Audio, Storage), sales receipts, supplier purchase orders, and pre-configured user accounts for every role:

| Operational Role | Login Email | Default Password | What They Do |
| :--- | :--- | :--- | :--- |
| **Store Manager** | `manager@ims.co.zw` | `manager123` | Approves refunds, sets ZiG exchange rates, reviews understaffed shift calendar |
| **Front Cashier** | `staff@ims.co.zw` | `staff123` | POS register checkout, issue dual-currency receipts (USD & ZiG), till float |
| **Warehouse Specialist**| `warehouse@ims.co.zw` | `warehouse123` | Goods Receiving (GRN), stock transfers dispatch, replenishment picking |
| **System Admin** | `admin@ims.co.zw` | `admin123` | User account management, server monitoring graphs, system security |
| **Compliance Auditor** | `auditor@ims.co.zw` | `auditor123` | Ledger integrity inspection, SHA-256 audit log inspection |

---

## 🛠️ Troubleshooting & Frequently Asked Questions

### Q: "I double-clicked `1-CLICK-START.bat`, but the browser says site cannot be reached."
- **Answer**: Wait 5 to 10 seconds for the backend services to finish booting up, then refresh your browser page (`F5`).

### Q: "Does the system automatically come with sample products and sales?"
- **Answer**: Yes! All database tables (products, suppliers, sales receipts, currencies) are automatically created and seeded with sample data on startup.

### Q: "How do I stop or close the application?"
- **Answer**: Simply close the green terminal launcher window. If running via Docker, open terminal and type `docker compose down`.

---

*Enterprise Inventory Management System (IMS) • Production Release*
