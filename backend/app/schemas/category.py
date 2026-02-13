from pydantic import BaseModel, UUID4
from typing import Optional, List

class SubcategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: UUID4

class SubcategoryCreate(SubcategoryBase):
    pass

class Subcategory(SubcategoryBase):
    id: UUID4
    is_active: bool

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: UUID4
    is_active: bool
    subcategories: List[Subcategory] = []

    class Config:
        from_attributes = True
