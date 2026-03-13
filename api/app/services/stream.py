import secrets

from app.config import settings


def generate_stream_key() -> str:
    """Generate a unique stream key for a camera."""
    return secrets.token_urlsafe(32)


def get_rtmp_url(stream_key: str) -> str:
    """Get the full RTMP URL for a camera to push to."""
    return f"{settings.rtmp_server_url}/live/{stream_key}"


def get_hls_url(stream_key: str) -> str:
    """Get the HLS playback URL for a camera stream."""
    return f"{settings.hls_base_url}/{stream_key}.m3u8"
