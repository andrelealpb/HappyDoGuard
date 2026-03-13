import uuid

from sqlalchemy import String, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, UUIDMixin, TimestampMixin


class CameraStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"


class Camera(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cameras"

    name: Mapped[str] = mapped_column(String(255))
    stream_key: Mapped[str] = mapped_column(String(64), unique=True)
    model: Mapped[str] = mapped_column(String(100), default="MIBO Intelbras")
    location_description: Mapped[str] = mapped_column(String(500), nullable=True)
    status: Mapped[CameraStatus] = mapped_column(
        SAEnum(CameraStatus), default=CameraStatus.OFFLINE
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stores.id")
    )

    store = relationship("Store", back_populates="cameras")
    recordings = relationship("Recording", back_populates="camera")
