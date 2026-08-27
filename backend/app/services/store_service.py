from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Store, Warehouse


def create_store(db: Session, store_data) -> Store:
    existing = db.query(Store).filter(Store.store_code == store_data.store_code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Store code '{store_data.store_code}' already exists",
        )

    store = Store(
        store_code=store_data.store_code,
        name=store_data.name,
        address=store_data.address,
        phone=store_data.phone,
        email=store_data.email,
        manager_id=store_data.manager_id,
        status=store_data.status,
        operating_hours=store_data.operating_hours,
    )
    db.add(store)
    db.commit()
    db.refresh(store)

    # Auto-create default warehouse for the store
    wh_code = f"WH-{store.store_code.replace('STR-', '')}-01"
    wh = Warehouse(
        warehouse_code=wh_code,
        store_id=store.id,
        name=f"{store.name} Main Warehouse",
        is_default=True,
        status="ACTIVE",
    )
    db.add(wh)
    db.commit()

    return store


def get_stores(db: Session):
    return db.query(Store).all()


def get_store_by_id(db: Session, store_id: int) -> Store:
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


def create_warehouse(db: Session, wh_data) -> Warehouse:
    existing = db.query(Warehouse).filter(Warehouse.warehouse_code == wh_data.warehouse_code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Warehouse code '{wh_data.warehouse_code}' already exists",
        )

    wh = Warehouse(
        warehouse_code=wh_data.warehouse_code,
        store_id=wh_data.store_id,
        name=wh_data.name,
        is_default=wh_data.is_default,
        status=wh_data.status,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


def get_warehouses_by_store(db: Session, store_id: int):
    return db.query(Warehouse).filter(Warehouse.store_id == store_id).all()
