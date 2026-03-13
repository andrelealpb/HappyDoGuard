from fastapi import APIRouter

from app.schemas.auth import Token, LoginRequest, UserCreate

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token."""
    # TODO: implement authentication
    return Token(access_token="not-implemented")


@router.post("/register")
async def register(user: UserCreate):
    """Register a new user (admin only)."""
    # TODO: implement registration
    return {"message": "not implemented"}
