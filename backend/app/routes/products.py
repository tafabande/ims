from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import Product, Category
from app.schemas import (
    ProductCreate, 
    ProductUpdate, 
    ProductResponse, 
    CategoryCreate, 
    CategoryResponse,
    CategoryTreeResponse
)
from app.services.cache_service import get_cache, set_cache, delete_cache, invalidate_pattern

router = APIRouter(prefix="/api/products", tags=["Products & Catalog"])

# ----------------- Category Routes & Hierarchical Tree -----------------

def format_category_node(cat: Category, db: Session) -> Dict[str, Any]:
    children = db.query(Category).filter(Category.parent_id == cat.id).all()
    return {
        "id": cat.id,
        "category_code": cat.category_code or f"CAT-{cat.id:06d}",
        "name": cat.name,
        "code": cat.code,
        "description": cat.description,
        "parent_id": cat.parent_id,
        "children": [format_category_node(child, db) for child in children]
    }

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """
    Get flat list of all categories.
    """
    return db.query(Category).all()

@router.get("/categories/tree", response_model=List[CategoryTreeResponse])
def get_category_tree(db: Session = Depends(get_db)):
    """
    Hierarchical Category Tree: Returns root categories with nested child subcategories.
    """
    root_categories = db.query(Category).filter(Category.parent_id == None).all()
    return [format_category_node(cat, db) for cat in root_categories]

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: CategoryCreate, db: Session = Depends(get_db)):
    """
    Create a new Category or Subcategory (if parent_id provided).
    Auto-generates human-readable category_code CAT-XXXXXX.
    """
    existing_code = db.query(Category).filter(Category.code == cat_in.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Category code already exists.")

    if cat_in.parent_id:
        parent = db.query(Category).filter(Category.id == cat_in.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent Category not found.")

    cat = Category(
        category_code=f"CAT-{cat_in.code.upper()}",
        name=cat_in.name,
        code=cat_in.code,
        description=cat_in.description,
        parent_id=cat_in.parent_id
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """
    Referential Protection on Deletion:
    Prevents deletion if products are assigned to this category. Returns 400 Bad Request.
    """
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    assigned_count = db.query(Product).filter(Product.category_id == category_id).count()
    if assigned_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category '{cat.name}': {assigned_count} products are currently assigned to it. Please reassign products before deleting."
        )

    # Check child categories
    children_count = db.query(Category).filter(Category.parent_id == category_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete parent category '{cat.name}': {children_count} subcategories depend on it."
        )

    db.delete(cat)
    db.commit()
    return None

# ----------------- Product Catalog Routes -----------------

@router.get("/", response_model=List[ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Cache-Aside: Check Redis cache first. If Miss, query PostgreSQL source-of-truth and populate Redis with 300s TTL.
    """
    cache_key = f"products:all:skip{skip}:limit{limit}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    products = db.query(Product).offset(skip).limit(limit).all()
    serialized = [
        {
            "id": p.id,
            "product_code": p.product_code or f"PRD-{p.id:06d}",
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "category_id": p.category_id,
            "supplier_id": p.supplier_id,
            "purchase_price": p.purchase_price,
            "selling_price": p.selling_price,
            "stock_quantity": p.stock_quantity,
            "reserved_quantity": p.reserved_quantity,
            "available_quantity": p.available_quantity,
            "reorder_level": p.reorder_level,
            "unit": p.unit,
            "barcode": p.barcode,
            "active": p.active,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in products
    ]
    set_cache(cache_key, serialized, ttl_seconds=300)
    return serialized

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    """
    Write to PostgreSQL source of truth -> Commit -> Deliberately invalidate Redis product cache.
    Auto-generates product_code PRD-XXXXXX.
    """
    existing_sku = db.query(Product).filter(Product.sku == product_in.sku).first()
    if existing_sku:
        raise HTTPException(status_code=400, detail="SKU already exists in inventory database.")

    product = Product(
        **product_in.model_dump()
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    product.product_code = f"PRD-{product.id:06d}"
    db.commit()
    db.refresh(product)

    invalidate_pattern("products:*")
    invalidate_pattern("dashboard:*")
    return product

@router.get("/{product_id}", response_model=ProductResponse)
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    """
    Cache-Aside Single Product GET
    """
    cache_key = f"product:{product_id}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    serialized = {
        "id": product.id,
        "product_code": product.product_code or f"PRD-{product.id:06d}",
        "sku": product.sku,
        "name": product.name,
        "description": product.description,
        "category_id": product.category_id,
        "supplier_id": product.supplier_id,
        "purchase_price": product.purchase_price,
        "selling_price": product.selling_price,
        "stock_quantity": product.stock_quantity,
        "reserved_quantity": product.reserved_quantity,
        "available_quantity": product.available_quantity,
        "reorder_level": product.reorder_level,
        "unit": product.unit,
        "barcode": product.barcode,
        "active": product.active,
        "created_at": product.created_at.isoformat() if product.created_at else None
    }
    set_cache(cache_key, serialized, ttl_seconds=300)
    return serialized

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product_in: ProductUpdate, db: Session = Depends(get_db)):
    """
    Update PostgreSQL source of truth -> Commit -> Invalidate single product and list cache
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    delete_cache(f"product:{product_id}")
    invalidate_pattern("products:*")
    invalidate_pattern("dashboard:*")
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """
    Delete from PostgreSQL source of truth -> Invalidate Redis cache
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()

    delete_cache(f"product:{product_id}")
    invalidate_pattern("products:*")
    invalidate_pattern("dashboard:*")
    return None
