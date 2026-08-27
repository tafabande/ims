import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import PaymentMethod, POPVerification, Sale


def seed_default_payment_methods(db: Session):
    """
    Seed default Zimbabwean & regional payment options if table is empty using SQLModel select.
    """
    statement = select(PaymentMethod)
    existing_count = len(db.exec(statement).all()) if hasattr(db, "exec") else db.query(PaymentMethod).count()
    if existing_count == 0:
        defaults = [
            PaymentMethod(
                code="CASH_USD",
                name="USD Cash",
                type="CASH",
                markup_percentage=0.0,
                instructions="Pay exact physical cash to cashier at till point.",
                requires_pop=False,
                is_active=True,
            ),
            PaymentMethod(
                code="ECOCASH_MERCHANT",
                name="EcoCash Merchant",
                type="MOBILE_MONEY",
                merchant_number="304891",
                merchant_name="Harare Main Delta Store",
                markup_percentage=2.5,  # 2.5% surcharge markup
                instructions="Dial *151*2*2# Enter Merchant Code 304891. Enter amount & PIN. Submit EcoCash approval SMS ref.",
                requires_pop=True,
                is_active=True,
            ),
            PaymentMethod(
                code="INNBUCKS",
                name="InnBucks Pay",
                type="MOBILE_MONEY",
                merchant_number="89210",
                merchant_name="Harare Central Hub",
                markup_percentage=1.0,
                instructions="Dial *569# or open InnBucks App. Enter Merchant Code 89210.",
                requires_pop=True,
                is_active=True,
            ),
            PaymentMethod(
                code="ZIPIT_TRANSFER",
                name="ZiG / ZIPIT Bank Transfer",
                type="BANK_TRANSFER",
                merchant_number="100489210491",
                merchant_name="IMS Enterprise Zimbabwe Bank",
                markup_percentage=0.0,
                instructions="Transfer to Account #100489210491 (CABS/NMB). Upload POP receipt PDF/image.",
                requires_pop=True,
                is_active=True,
            ),
        ]
        db.add_all(defaults)
        db.commit()


def create_payment_method(
    db: Session,
    code: str,
    name: str,
    type: str = "MOBILE_MONEY",
    merchant_number: str | None = None,
    merchant_name: str | None = None,
    markup_percentage: float = 0.0,
    instructions: str | None = None,
    requires_pop: bool = True,
) -> PaymentMethod:
    statement = select(PaymentMethod).where(PaymentMethod.code == code)
    existing = (
        db.exec(statement).first()
        if hasattr(db, "exec")
        else db.query(PaymentMethod).filter(PaymentMethod.code == code).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Payment method with code '{code}' already exists.")

    pm = PaymentMethod(
        code=code.upper(),
        name=name,
        type=type,
        merchant_number=merchant_number,
        merchant_name=merchant_name,
        markup_percentage=markup_percentage,
        instructions=instructions,
        requires_pop=requires_pop,
        is_active=True,
        created_at=datetime.now(UTC),
    )
    db.add(pm)
    db.commit()
    db.refresh(pm)
    return pm


def list_payment_methods(db: Session, active_only: bool = True) -> list[PaymentMethod]:
    seed_default_payment_methods(db)
    statement = select(PaymentMethod)
    if active_only:
        statement = statement.where(PaymentMethod.is_active == True)
    if hasattr(db, "exec"):
        return db.exec(statement).all()
    query = db.query(PaymentMethod)
    if active_only:
        query = query.filter(PaymentMethod.is_active == True)
    return query.order_by(PaymentMethod.id.asc()).all()


def submit_proof_of_payment(
    db: Session,
    payment_method_id: int,
    transaction_reference: str,
    base_amount: float,
    sale_id: int | None = None,
    pop_file_key: str | None = None,
) -> POPVerification:
    statement = select(PaymentMethod).where(PaymentMethod.id == payment_method_id)
    pm = (
        db.exec(statement).first()
        if hasattr(db, "exec")
        else db.query(PaymentMethod).filter(PaymentMethod.id == payment_method_id).first()
    )
    if not pm:
        raise HTTPException(status_code=404, detail="Payment method not found.")

    if not pm.is_active:
        raise HTTPException(status_code=400, detail=f"Payment method '{pm.name}' is currently inactive.")

    # Calculate Markup Fee Amount
    markup_amount = (base_amount * (pm.markup_percentage / 100.0)) if pm.markup_percentage > 0 else 0.0
    total_amount_paid = base_amount + markup_amount

    pop_code = f"POP-2026-{uuid.uuid4().hex[:6].upper()}"

    pop = POPVerification(
        pop_code=pop_code,
        sale_id=sale_id,
        payment_method_id=payment_method_id,
        transaction_reference=transaction_reference,
        pop_file_key=pop_file_key,
        base_amount=base_amount,
        markup_amount=markup_amount,
        total_amount_paid=total_amount_paid,
        status="PENDING_VERIFICATION",
        created_at=datetime.now(UTC),
    )
    db.add(pop)

    # If associated with a sale, update sale payment status
    if sale_id:
        sale_stmt = select(Sale).where(Sale.id == sale_id)
        sale = db.exec(sale_stmt).first() if hasattr(db, "exec") else db.query(Sale).filter(Sale.id == sale_id).first()
        if sale:
            sale.payment_method = pm.name
            sale.payment_status = "PENDING_VERIFICATION"

    db.commit()
    db.refresh(pop)
    return pop


def verify_pop(db: Session, pop_id: int, verifier_user_id: int) -> POPVerification:
    statement = select(POPVerification).where(POPVerification.id == pop_id)
    pop = (
        db.exec(statement).first()
        if hasattr(db, "exec")
        else db.query(POPVerification).filter(POPVerification.id == pop_id).first()
    )
    if not pop:
        raise HTTPException(status_code=404, detail="POP verification record not found.")

    if pop.status == "VERIFIED":
        raise HTTPException(status_code=400, detail="POP is already verified.")

    now = datetime.now(UTC)
    pop.status = "VERIFIED"
    pop.verified_by_user_id = verifier_user_id
    pop.verified_at = now

    # Update associated sale payment status to PAID
    if pop.sale_id:
        sale_stmt = select(Sale).where(Sale.id == pop.sale_id)
        sale = (
            db.exec(sale_stmt).first() if hasattr(db, "exec") else db.query(Sale).filter(Sale.id == pop.sale_id).first()
        )
        if sale:
            sale.payment_status = "PAID"

    db.commit()
    db.refresh(pop)
    return pop


def reject_pop(db: Session, pop_id: int, verifier_user_id: int, rejection_reason: str) -> POPVerification:
    statement = select(POPVerification).where(POPVerification.id == pop_id)
    pop = (
        db.exec(statement).first()
        if hasattr(db, "exec")
        else db.query(POPVerification).filter(POPVerification.id == pop_id).first()
    )
    if not pop:
        raise HTTPException(status_code=404, detail="POP verification record not found.")

    now = datetime.now(UTC)
    pop.status = "REJECTED"
    pop.rejection_reason = rejection_reason
    pop.verified_by_user_id = verifier_user_id
    pop.verified_at = now

    if pop.sale_id:
        sale_stmt = select(Sale).where(Sale.id == pop.sale_id)
        sale = (
            db.exec(sale_stmt).first() if hasattr(db, "exec") else db.query(Sale).filter(Sale.id == pop.sale_id).first()
        )
        if sale:
            sale.payment_status = "PAYMENT_REJECTED"

    db.commit()
    db.refresh(pop)
    return pop


def list_pop_queue(db: Session, status_filter: str | None = None) -> list[POPVerification]:
    statement = select(POPVerification)
    if status_filter:
        statement = statement.where(POPVerification.status == status_filter)
    if hasattr(db, "exec"):
        return db.exec(statement).all()
    query = db.query(POPVerification)
    if status_filter:
        query = query.filter(POPVerification.status == status_filter)
    return query.order_by(POPVerification.created_at.desc()).all()
