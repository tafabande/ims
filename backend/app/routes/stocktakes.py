from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import UserContext, require_permission
from app.schemas import StocktakeCreate, StocktakeResponse
from app.services import stocktake_service

router = APIRouter(prefix="/api/stocktakes", tags=["Stock Counting & Audit"])


@router.post("", response_model=StocktakeResponse, status_code=status.HTTP_201_CREATED)
def create_stocktake_session(
    stk_data: StocktakeCreate,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:count")),
):
    return stocktake_service.create_stocktake(db, stk_data)


@router.post("/{stocktake_id}/approve", response_model=StocktakeResponse)
def approve_stocktake_session(
    stocktake_id: int,
    approved_by_emp_id: int,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:adjust")),
):
    return stocktake_service.approve_stocktake(db, stocktake_id, approved_by_emp_id)


@router.get("", response_model=list[StocktakeResponse])
def list_stocktakes(
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:view")),
):
    return stocktake_service.get_stocktakes(db)


@router.get("/{stocktake_id}", response_model=StocktakeResponse)
def get_stocktake(
    stocktake_id: int,
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("inventory:view")),
):
    return stocktake_service.get_stocktake_by_id(db, stocktake_id)
