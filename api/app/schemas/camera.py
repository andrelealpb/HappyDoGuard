import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.camera import CameraStatus


class CameraCreate(BaseModel):
    name: str
    store_id: uuid.UUID
    model: str = "MIBO Intelbras"
    location_description: str | None = None


class CameraUpdate(BaseModel):
    name: str | None = None
    location_description: str | None = None
    model: str | None = None


class CameraResponse(BaseModel):
    id: uuid.UUID
    name: str
    stream_key: str
    model: str
    location_description: str | None
    status: CameraStatus
    store_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
