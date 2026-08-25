from app.database import SessionLocal, engine, Base
from app.models import Category, Supplier, Customer, Product, InventoryTransaction, User, Store, Warehouse, Register, Employee, PaymentMethodConfig

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(Product).first():
        print("Database already contains data. Skipping seed.")
        db.close()
        return

    print("Seeding initial IMS database records...")

    # Seed Users
    users = [
        User(email="admin@ims.com", hashed_password=bcrypt.hash("admin123"), full_name="Alice Admin", role="ADMIN", department="Executive"),
        User(email="manager@ims.com", hashed_password=bcrypt.hash("manager123"), full_name="Bob Manager", role="MANAGER", department="Inventory Ops"),
        User(email="staff@ims.com", hashed_password=bcrypt.hash("staff123"), full_name="Charlie Staff", role="STAFF", department="Sales & POS"),
    ]
    db.add_all(users)
    db.flush()

    # Seed Employees
    emp1 = Employee(employee_code="EMP-2026-0001", first_name="Alice", last_name="Admin", email="admin@ims.com", status="ACTIVE", user_id=users[0].id)
    emp2 = Employee(employee_code="EMP-2026-0002", first_name="Bob", last_name="Manager", email="manager@ims.com", status="ACTIVE", user_id=users[1].id)
    emp3 = Employee(employee_code="EMP-2026-0003", first_name="Charlie", last_name="Staff", email="staff@ims.com", status="ACTIVE", user_id=users[2].id)
    db.add_all([emp1, emp2, emp3])
    db.flush()

    # Seed Stores & Warehouses
    str1 = Store(store_code="STR-HRE-001", name="Harare Flagship Store", address="100 Sam Nujoma Street", phone="+263 77 123 4567", email="hre@ims.com", manager_id=emp2.id)
    str2 = Store(store_code="STR-BYO-001", name="Bulawayo Branch", address="45 Leopold Takawira Ave", phone="+263 77 987 6543", email="byo@ims.com", manager_id=emp2.id)
    db.add_all([str1, str2])
    db.flush()

    wh1 = Warehouse(warehouse_code="WH-HRE-001", store_id=str1.id, name="Harare Main Warehouse", is_default=True)
    wh2 = Warehouse(warehouse_code="WH-BYO-001", store_id=str2.id, name="Bulawayo Main Warehouse", is_default=True)
    db.add_all([wh1, wh2])
    db.flush()

    # Seed Cash Registers
    reg1 = Register(register_code="POS-HRE-001", store_id=str1.id, name="Till 01 - Main Counter", status="CLOSED")
    reg2 = Register(register_code="POS-BYO-001", store_id=str2.id, name="Till 01 - Express Counter", status="CLOSED")
    db.add_all([reg1, reg2])

    # Seed Payment Methods
    pm1 = PaymentMethodConfig(code="CASH", name="Cash", fee_percentage=0.0, enabled=True)
    pm2 = PaymentMethodConfig(code="CARD", name="Credit / Debit Card", fee_percentage=1.5, enabled=True)
    pm3 = PaymentMethodConfig(code="MOBILE_MONEY", name="Mobile Money", fee_percentage=1.0, enabled=True)
    pm4 = PaymentMethodConfig(code="BANK_TRANSFER", name="Bank Wire Transfer", fee_percentage=0.0, enabled=True)
    db.add_all([pm1, pm2, pm3, pm4])

    # Seed Categories
    cat1 = Category(name="Laptops & Computers", code="CAT-LAP", description="High-performance laptops and workstations")
    cat2 = Category(name="Peripherals & Accessories", code="CAT-ACC", description="Input devices and computer accessories")
    cat3 = Category(name="Monitors & Displays", code="CAT-MON", description="4K IPS & UltraWide displays")
    db.add_all([cat1, cat2, cat3])
    db.flush()

    # Seed Suppliers
    sup1 = Supplier(name="TechDistro Global Inc", contact_person="David Miller", email="sales@techdistro.com", phone="+1 800-555-0199", address="100 Silicon Way, San Jose, CA")
    sup2 = Supplier(name="OmniHardware Supply", contact_person="Sarah Connor", email="orders@omnihardware.io", phone="+1 800-555-0288", address="450 Industrial Pkwy, Chicago, IL")
    db.add_all([sup1, sup2])
    db.flush()

    # Seed Customers
    cust1 = Customer(name="Apex Retail Stores", contact_person="John Wick", email="procurement@apexretail.com", phone="+1 555-0123")
    cust2 = Customer(name="Acme Enterprise", contact_person="Bruce Wayne", email="accounts@acme.com", phone="+1 555-0312")
    db.add_all([cust1, cust2])
    db.flush()

    # Seed Products
    prod1 = Product(
        sku="LAP-001", name="Lenovo ThinkPad X1 Carbon Gen 11", description="14' FHD+, Intel i7, 16GB RAM, 512GB SSD",
        category_id=cat1.id, supplier_id=sup1.id, purchase_price=1100.0, selling_price=1450.0, stock_quantity=18, reorder_level=5, unit="Units", barcode="883920194821"
    )
    prod2 = Product(
        sku="LAP-002", name="Dell XPS 15 9530", description="15.6' OLED, i9, 32GB RAM, 1TB SSD",
        category_id=cat1.id, supplier_id=sup1.id, purchase_price=1600.0, selling_price=2100.0, stock_quantity=4, reorder_level=6, unit="Units", barcode="883920194822"
    )
    prod3 = Product(
        sku="ACC-001", name="Logitech MX Master 3S Wireless Mouse", description="Ergonomic 8K DPI Mouse",
        category_id=cat2.id, supplier_id=sup2.id, purchase_price=65.0, selling_price=99.0, stock_quantity=42, reorder_level=10, unit="Units", barcode="883920194823"
    )
    db.add_all([prod1, prod2, prod3])
    db.flush()

    # Seed Transactions
    tx1 = InventoryTransaction(product_id=prod1.id, type="PURCHASE", quantity=20, reference="PO-2026-001", user_name="Bob Manager", notes="Initial stock intake")
    tx2 = InventoryTransaction(product_id=prod1.id, type="SALE", quantity=-2, reference="INV-2026-101", user_name="Charlie Staff", notes="POS Sale to Apex Retail")
    db.add_all([tx1, tx2])

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_db()

