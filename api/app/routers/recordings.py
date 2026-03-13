import uuid

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_recordings(camera_id: uuid.UUID | None = None):
    """List recordings, optionally filtered by camera."""
    # TODO: implement with database
    return []


@router.get("/{recording_id}")
async def get_recording(recording_id: uuid.UUID):
    """Get recording details and download URL."""
    # TODO: implement with database
    raise NotImplementedError
