from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websockets import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Wait for any data (keeps connection alive)
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client")
    except Exception as e:
        logger.error(f"Error in websocket loop: {e}")
    finally:
        manager.disconnect(websocket)
