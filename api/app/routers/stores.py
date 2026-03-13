import uuid

from fastapi import APIRouter

from app.schemas.store import StoreCreate, StoreUpdate, StoreResponse

router = APIRouter()


@router.get("/", response_model=list[StoreResponse])
async def list_stores():
    """List all stores."""
    # TODO: implement with database
    return []


@router.post("/", response_model=StoreResponse, status_code=201)
async def create_store(store: StoreCreate):
    """Create a new store."""
    # TODO: implement with database
    raise NotImplementedError


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(store_id: uuid.UUID):
    """Get store details."""
    # TODO: implement with database
    raise NotImplementedError


@router.patch("/{store_id}", response_model=StoreResponse)
async def update_store(store_id: uuid.UUID, store: StoreUpdate):
    """Update store details."""
    # TODO: implement with database
    raise NotImplementedError
