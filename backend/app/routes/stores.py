from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import StoreCreate, StoreResponse, WarehouseCreate, WarehouseResponse
from app.services import store_service

router = APIRouter(prefix="/api/stores", tags=["Store Operations"])

@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_new_store(store_data: StoreCreate, db: Session = Depends(get_db)):
    return store_service.create_store(db, store_data)

@router.get("", response_model=List[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    return store_service.get_stores(db)

@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_db)):
    return store_service.get_store_by_id(db, store_id)

@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_new_warehouse(wh_data: WarehouseCreate, db: Session = Depends(get_db)):
    return store_service.create_warehouse(db, wh_data)

@router.get("/{store_id}/warehouses", response_model=List[WarehouseResponse])
def get_warehouses_for_store(store_id: int, db: Session = Depends(get_db)):
    return store_service.get_warehouses_by_store(db, store_id)
