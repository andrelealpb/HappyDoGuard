from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "HappyDo Guard API"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://happydo:happydo@db:5432/happydo_guard"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # JWT
    secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Nginx-RTMP
    rtmp_server_url: str = "rtmp://nginx-rtmp:1935"
    hls_base_url: str = "http://nginx-rtmp:8080/hls"

    # Storage
    recordings_path: str = "/data/recordings"

    model_config = {"env_prefix": "HAPPYDO_"}


settings = Settings()
