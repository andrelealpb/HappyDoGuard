from fastapi import APIRouter, Query, Response

router = APIRouter()


@router.get("/on-publish")
async def on_publish(
    name: str = Query(..., description="Stream key"),
    addr: str = Query("", description="Client IP address"),
):
    """
    Called by Nginx-RTMP when a stream starts publishing.
    Validates the stream key and updates camera status.
    Return 2xx to allow, 4xx to reject.
    """
    # TODO: validate stream_key against database
    # TODO: update camera status to ONLINE
    return Response(status_code=200)


@router.get("/on-publish-done")
async def on_publish_done(
    name: str = Query(..., description="Stream key"),
):
    """
    Called by Nginx-RTMP when a stream stops publishing.
    Updates camera status to OFFLINE.
    """
    # TODO: update camera status to OFFLINE
    return Response(status_code=200)


@router.get("/on-record-done")
async def on_record_done(
    name: str = Query(..., description="Stream key"),
    path: str = Query("", description="Path to recorded file"),
):
    """
    Called by Nginx-RTMP when recording of a stream segment finishes.
    Creates a recording entry in the database.
    """
    # TODO: create Recording entry in database
    return Response(status_code=200)
