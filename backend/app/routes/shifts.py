from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import ShiftOpenRequest, ShiftCloseRequest, ShiftResponse, RegisterCreate, RegisterResponse
from app.services import shift_service
from app.models import Register

router = APIRouter(prefix="/api/shifts", tags=["Shift & Till Operations"])

@router.post("/registers", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def create_register(reg_data: RegisterCreate, db: Session = Depends(get_db)):
    existing = db.query(Register).filter(Register.register_code == reg_data.register_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Register code '{reg_data.register_code}' already exists")
    reg = Register(
        register_code=reg_data.register_code,
        store_id=reg_data.store_id,
        name=reg_data.name,
        status=reg_data.status
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg

@router.get("/registers", response_model=List[RegisterResponse])
def list_registers(store_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Register)
    if store_id:
        query = query.filter(Register.store_id == store_id)
    return query.all()

@router.post("/open", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def open_new_shift(open_data: ShiftOpenRequest, db: Session = Depends(get_db)):
    return shift_service.open_shift(db, open_data)

@router.post("/{shift_id}/close", response_model=ShiftResponse)
def close_existing_shift(shift_id: int, close_data: ShiftCloseRequest, db: Session = Depends(get_db)):
    return shift_service.close_shift(db, shift_id, close_data)

@router.get("/employee/{employee_id}/active", response_model=Optional[ShiftResponse])
def get_employee_active_shift(employee_id: int, db: Session = Depends(get_db)):
    return shift_service.get_active_shift_for_employee(db, employee_id)
