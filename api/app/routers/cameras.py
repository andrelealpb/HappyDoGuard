import uuid

from fastapi import APIRouter

from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse
from app.services.stream import get_hls_url, get_rtmp_url

router = APIRouter()


@router.get("/", response_model=list[CameraResponse])
async def list_cameras(store_id: uuid.UUID | None = None):
    """List all cameras, optionally filtered by store."""
    # TODO: implement with database
    return []


@router.post("/", response_model=CameraResponse, status_code=201)
async def create_camera(camera: CameraCreate):
    """Register a new camera. Generates a unique stream key."""
    # TODO: implement with database
    raise NotImplementedError


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: uuid.UUID):
    """Get camera details including stream URLs."""
    # TODO: implement with database
    raise NotImplementedError


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: uuid.UUID, camera: CameraUpdate):
    """Update camera details."""
    # TODO: implement with database
    raise NotImplementedError


@router.get("/{camera_id}/stream-urls")
async def get_stream_urls(camera_id: uuid.UUID):
    """Get RTMP ingest and HLS playback URLs for a camera."""
    # TODO: fetch stream_key from database
    stream_key = "placeholder"
    return {
        "rtmp_url": get_rtmp_url(stream_key),
        "hls_url": get_hls_url(stream_key),
    }
