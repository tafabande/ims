from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import ReturnOrderCreate, ReturnOrderResponse
from app.services import returns_service

router = APIRouter(prefix="/api/returns", tags=["Returns & Refunds"])

@router.post("", response_model=ReturnOrderResponse, status_code=status.HTTP_201_CREATED)
def create_return(return_data: ReturnOrderCreate, db: Session = Depends(get_db)):
    return returns_service.process_return_order(db, return_data)

@router.get("", response_model=List[ReturnOrderResponse])
def list_returns(db: Session = Depends(get_db)):
    return returns_service.get_returns(db)

@router.get("/{return_id}", response_model=ReturnOrderResponse)
def get_return(return_id: int, db: Session = Depends(get_db)):
    return returns_service.get_return_by_id(db, return_id)
