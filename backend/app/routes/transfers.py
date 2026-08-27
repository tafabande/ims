from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import UserContext, require_permission
from app.schemas import StockTransferCreate, StockTransferResponse
from app.services import transfer_service

router = APIRouter(prefix="/api/transfers", tags=["Stock Transfers"])


@router.post("", response_model=StockTransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer_data: StockTransferCreate,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:transfer")),
):
    return transfer_service.create_stock_transfer(db, transfer_data)


@router.get("", response_model=list[StockTransferResponse])
def list_transfers(
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:view")),
):
    return transfer_service.get_transfers(db)


@router.get("/{transfer_id}", response_model=StockTransferResponse)
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:view")),
):
    return transfer_service.get_transfer_by_id(db, transfer_id)
