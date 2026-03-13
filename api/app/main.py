from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import cameras, stores, hooks, recordings, auth

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(stores.router, prefix="/stores", tags=["stores"])
app.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
app.include_router(recordings.router, prefix="/recordings", tags=["recordings"])
app.include_router(hooks.router, prefix="/hooks", tags=["hooks"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}
