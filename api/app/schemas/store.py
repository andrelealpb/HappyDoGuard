import uuid
from datetime import datetime

from pydantic import BaseModel


class StoreCreate(BaseModel):
    name: str
    address: str
    city: str
    state: str


class StoreUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    is_active: bool | None = None


class StoreResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    city: str
    state: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
