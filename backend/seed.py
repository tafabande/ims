import os

from app.database import Base, SessionLocal, engine
from app.models import (
    Category,
    Customer,
    Product,
    Purchase,
    PurchaseItem,
    Sale,
    Supplier,
    User,
)
from app.services.iam_service import hash_password
from app.services.payment_service import seed_default_payment_methods
from app.services.settings_service import seed_default_settings

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if _ENVIRONMENT == "production":
    raise RuntimeError("FATAL: Sample database seeding is strictly prohibited in production.")


def seed_sample_users(db):
    """Seed initial system users for all operational roles"""
    users_data = [
        {
            "user_code": "USR-000001",
            "email": "admin@ims.co.zw",
            "full_name": "System Administrator",
            "role": "APP_ADMIN",
            "department": "IT Governance",
            "password": "admin123",
        },
        {
            "user_code": "USR-000002",
            "email": "manager@ims.co.zw",
            "full_name": "Store Operations Manager",
            "role": "MANAGER",
            "department": "Store Operations",
            "password": "manager123",
        },
        {
            "user_code": "USR-000003",
            "email": "staff@ims.co.zw",
            "full_name": "Front-Desk Cashier",
            "role": "STAFF",
            "department": "Front Desk Sales",
            "password": "staff123",
        },
        {
            "user_code": "USR-000004",
            "email": "warehouse@ims.co.zw",
            "full_name": "Warehouse Specialist",
            "role": "WAREHOUSE",
            "department": "Logistics & Stock Control",
            "password": "warehouse123",
        },
        {
            "user_code": "USR-000005",
            "email": "auditor@ims.co.zw",
            "full_name": "Financial Compliance Auditor",
            "role": "AUDITOR",
            "department": "Audit & Compliance",
            "password": "auditor123",
        },
    ]

    for item in users_data:
        email = item["email"]
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            data = dict(item)
            pwd = data.pop("password")
            user = User(**data, hashed_password=hash_password(pwd), active=True)
            db.add(user)
    db.commit()
    print("[OK] Sample user accounts seeded for all roles.")


def seed_sample_categories(db):
    """Seed product categories"""
    if db.query(Category).count() > 0:
        return

    categories = [
        Category(
            category_code="CAT-000001",
            name="Computers & Laptops",
            code="COMP",
            description="Laptops, Desktop Workstations & Servers",
        ),
        Category(
            category_code="CAT-000002",
            name="Peripherals & Input",
            code="PERIPH",
            description="Mice, Keyboards, Monitors & Accessories",
        ),
        Category(
            category_code="CAT-000003",
            name="Audio & Media",
            code="AUDIO",
            description="Cassettes, Reels, Vinyl Records & Players",
        ),
        Category(
            category_code="CAT-000004",
            name="Digital Storage",
            code="STOR",
            description="Flash Drives, Hard Disks, Floppy Disks, CDs & DVDs",
        ),
        Category(
            category_code="CAT-000005",
            name="Accessories & Cables",
            code="ACC",
            description="Power Chargers, Ethernet Cables & Hubs",
        ),
        Category(
            category_code="CAT-000006",
            name="Office Equipment",
            code="OFFICE",
            description="Typewriters, Printers & Scanners",
        ),
    ]
    db.add_all(categories)
    db.commit()
    print("[OK] Sample categories seeded.")


def seed_sample_suppliers(db):
    """Seed suppliers"""
    if db.query(Supplier).count() > 0:
        return

    suppliers = [
        Supplier(
            name="TechCorp International",
            contact_person="David Miller",
            email="orders@techcorp.com",
            phone="+263 242 700900",
            address="10 Tech Way, Harare CBD",
        ),
        Supplier(
            name="Global Hardware Distributors",
            contact_person="Sarah Jenkins",
            email="sales@globalhd.co.zw",
            phone="+263 292 881020",
            address="45 Industrial Park, Bulawayo",
        ),
        Supplier(
            name="Apex Digital Supply Ltd",
            contact_person="Michael Moyo",
            email="supply@apexdigital.co.zw",
            phone="+263 202 611200",
            address="12 Commercial Rd, Mutare",
        ),
    ]
    db.add_all(suppliers)
    db.commit()
    print("[OK] Sample suppliers seeded.")


def seed_sample_customers(db):
    """Seed customers"""
    if db.query(Customer).count() > 0:
        return

    customers = [
        Customer(
            name="Walk-in Customer",
            contact_person="General Public",
            email="walkin@ims.co.zw",
            phone="+263 000 000000",
        ),
        Customer(
            name="Harare Commercial Bank",
            contact_person="Tafadzwa Chitepo",
            email="procurement@hcb.co.zw",
            phone="+263 242 889001",
        ),
        Customer(
            name="Bulawayo Retailers Association",
            contact_person="Grace Ndlovu",
            email="info@byoretail.co.zw",
            phone="+263 292 667800",
        ),
    ]
    db.add_all(customers)
    db.commit()
    print("[OK] Sample customers seeded.")


def seed_sample_products(db):
    """Seed sample products"""
    if db.query(Product).count() > 0:
        return

    cat_comp = db.query(Category).filter_by(code="COMP").first()
    cat_periph = db.query(Category).filter_by(code="PERIPH").first()
    cat_audio = db.query(Category).filter_by(code="AUDIO").first()
    cat_stor = db.query(Category).filter_by(code="STOR").first()
    cat_acc = db.query(Category).filter_by(code="ACC").first()
    cat_office = db.query(Category).filter_by(code="OFFICE").first()

    sup_tech = db.query(Supplier).filter_by(name="TechCorp International").first()
    sup_global = db.query(Supplier).filter_by(name="Global Hardware Distributors").first()

    products = [
        Product(
            product_code="PRD-000001",
            sku="SKU-DELL-XPS15",
            name="Dell XPS 15 Workstation Laptop 32GB RAM",
            description="High-performance laptop for enterprise design and analysis",
            category_id=cat_comp.id,
            supplier_id=sup_tech.id,
            purchase_price=1100.00,
            selling_price=1450.00,
            stock_quantity=143,
            reorder_level=20,
            unit="Units",
            barcode="202000000012",
        ),
        Product(
            product_code="PRD-000002",
            sku="SKU-LOGI-MX3S",
            name="Logitech MX Master 3S Wireless Mouse",
            description="Ergonomic high-precision wireless laser mouse",
            category_id=cat_periph.id,
            supplier_id=sup_tech.id,
            purchase_price=65.00,
            selling_price=99.00,
            stock_quantity=55,
            reorder_level=15,
            unit="Units",
            barcode="202000000013",
        ),
        Product(
            product_code="PRD-000003",
            sku="SKU-PWR-65W",
            name="USB-C 65W Universal Power Adapter",
            description="Multi-voltage fast charging power brick",
            category_id=cat_acc.id,
            supplier_id=sup_global.id,
            purchase_price=14.00,
            selling_price=29.99,
            stock_quantity=12,
            reorder_level=20,
            unit="Units",
            barcode="202000000014",
        ),
        Product(
            product_code="PRD-000004",
            sku="SKU-2014-FLASH",
            name="32GB USB 3.0 Flash Drive",
            description="High-speed USB thumb drive for file transfers",
            category_id=cat_stor.id,
            supplier_id=sup_global.id,
            purchase_price=7.50,
            selling_price=15.00,
            stock_quantity=140,
            reorder_level=30,
            unit="Units",
            barcode="201400000011",
        ),
        Product(
            product_code="PRD-000005",
            sku="SKU-NET-CAT6",
            name="CAT6 Ethernet Cable 100m Roll",
            description="Unshielded twisted pair copper networking cable",
            category_id=cat_acc.id,
            supplier_id=sup_global.id,
            purchase_price=35.00,
            selling_price=65.00,
            stock_quantity=28,
            reorder_level=10,
            unit="Rolls",
            barcode="202000000015",
        ),
        Product(
            product_code="PRD-000006",
            sku="SKU-1972-CASSETTE",
            name="C-90 Compact Audio Cassette Tape",
            description="Classic high-bias audio cassette tape",
            category_id=cat_audio.id,
            supplier_id=sup_global.id,
            purchase_price=1.20,
            selling_price=2.99,
            stock_quantity=120,
            reorder_level=25,
            unit="Units",
            barcode="197200000003",
        ),
        Product(
            product_code="PRD-000007",
            sku="SKU-1975-TYPEWRITER",
            name="Manual Mechanical Typewriter - Steel Frame",
            description="Vintage heavy-duty office typewriter",
            category_id=cat_office.id,
            supplier_id=sup_global.id,
            purchase_price=85.00,
            selling_price=150.00,
            stock_quantity=4,
            reorder_level=2,
            unit="Units",
            barcode="197500000004",
        ),
        Product(
            product_code="PRD-000008",
            sku="SKU-LOGI-K860",
            name="Logitech ERGO K860 Wireless Split Keyboard",
            description="Split ergonomic keyboard with wrist cushion",
            category_id=cat_periph.id,
            supplier_id=sup_tech.id,
            purchase_price=75.00,
            selling_price=125.00,
            stock_quantity=0,
            reorder_level=5,
            unit="Units",
            barcode="202000000016",
        ),
    ]
    db.add_all(products)
    db.commit()
    print("[OK] Sample products seeded.")


def seed_sample_purchases(db):
    """Seed sample purchase orders (GRNs)"""
    if db.query(Purchase).count() > 0:
        return

    supplier = db.query(Supplier).first()
    product = db.query(Product).first()
    if supplier and product:
        po = Purchase(
            po_number="PO-2026-000057",
            supplier_id=supplier.id,
            status="RECEIVED",
            total_amount=11000.00,
        )
        db.add(po)
        db.commit()

        item = PurchaseItem(purchase_id=po.id, product_id=product.id, quantity=10, unit_price=1100.00)
        db.add(item)
        db.commit()
        print("[OK] Sample purchase orders (GRNs) seeded.")


def seed_sample_sales(db):
    """Seed sample sales transactions"""
    if db.query(Sale).count() > 0:
        return

    customer = db.query(Customer).first()
    sale1 = Sale(
        invoice_number="SAL-2026-000184",
        customer_id=customer.id if customer else None,
        total_amount=1479.99,
        payment_status="PAID",
        payment_method="CASH",
        created_by="staff@ims.co.zw",
    )
    sale2 = Sale(
        invoice_number="SAL-2026-000185",
        customer_id=customer.id if customer else None,
        total_amount=99.00,
        payment_status="PAID",
        payment_method="EcoCash Mobile Money",
        created_by="staff@ims.co.zw",
    )
    db.add_all([sale1, sale2])
    db.commit()
    print("[OK] Sample sales transactions seeded.")


def seed_db():
    """
    Plain IMS Database Initialization:
    Ensures database schema tables exist and seeds settings, payment methods, users, categories, products, purchases, and sales.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_settings(db)
        seed_default_payment_methods(db)
        seed_sample_users(db)
        seed_sample_categories(db)
        seed_sample_suppliers(db)
        seed_sample_customers(db)
        seed_sample_products(db)
        seed_sample_purchases(db)
        seed_sample_sales(db)
        print("Database schema and sample data initialized successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
