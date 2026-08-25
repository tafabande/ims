from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Shift, Register, Employee
from datetime import datetime, timezone
import uuid

def open_shift(db: Session, open_data) -> Shift:
    # Verify register exists
    register = db.query(Register).filter(Register.id == open_data.register_id).first()
    if not register:
        raise HTTPException(status_code=404, detail="Cash Register not found")
    
    if register.status == "OPEN":
        raise HTTPException(status_code=400, detail=f"Register '{register.register_code}' is currently OPEN by another shift")
    
    # Verify active shift for employee
    active_shift = db.query(Shift).filter(
        Shift.employee_id == open_data.employee_id,
        Shift.status == "OPEN"
    ).first()
    if active_shift:
        raise HTTPException(status_code=400, detail="Employee already has an active open shift")
    
    shift_code = f"SHIFT-2026-{uuid.uuid4().hex[:5].upper()}"
    shift = Shift(
        shift_code=shift_code,
        employee_id=open_data.employee_id,
        store_id=open_data.store_id,
        register_id=open_data.register_id,
        start_time=datetime.now(timezone.utc),
        opening_cash=open_data.opening_cash,
        sales_total=0.0,
        refunds_total=0.0,
        expected_cash=open_data.opening_cash,
        status="OPEN"
    )
    
    register.status = "OPEN"
    register.current_operator_id = open_data.employee_id
    register.current_balance = open_data.opening_cash

    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift

def close_shift(db: Session, shift_id: int, close_data) -> Shift:
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if shift.status != "OPEN":
        raise HTTPException(status_code=400, detail="Shift is not OPEN")

    shift.end_time = datetime.now(timezone.utc)
    shift.actual_cash = close_data.actual_cash
    shift.supervisor_id = close_data.supervisor_id
    
    # Expected cash = opening cash + sales total - refunds total
    shift.expected_cash = shift.opening_cash + shift.sales_total - shift.refunds_total
    shift.variance = round(shift.actual_cash - shift.expected_cash, 2)
    shift.status = "CLOSED"

    # Close register
    register = db.query(Register).filter(Register.id == shift.register_id).first()
    if register:
        register.status = "CLOSED"
        register.current_operator_id = None
        register.current_balance = shift.actual_cash

    db.commit()
    db.refresh(shift)
    return shift

def get_active_shift_for_employee(db: Session, employee_id: int) -> Shift:
    shift = db.query(Shift).filter(
        Shift.employee_id == employee_id,
        Shift.status == "OPEN"
    ).first()
    return shift

def record_shift_sale(db: Session, shift_id: int, sale_amount: float):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if shift and shift.status == "OPEN":
        shift.sales_total += sale_amount
        shift.expected_cash = shift.opening_cash + shift.sales_total - shift.refunds_total
        
        register = db.query(Register).filter(Register.id == shift.register_id).first()
        if register:
            register.current_balance += sale_amount
        db.commit()
