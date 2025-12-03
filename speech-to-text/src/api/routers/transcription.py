"""WebSocket endpoint enabling real-time speech-to-text streaming."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from ...streaming.session_manager import StreamingSessionManager

router = APIRouter()
logger = logging.getLogger(__name__)

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080").rstrip("/")
BACKEND_TIMEOUT_SECONDS = float(os.getenv("BACKEND_CALLBACK_TIMEOUT", "5"))
BACKEND_SERVICE_TOKEN = os.getenv("BACKEND_SERVICE_TOKEN")

DEFAULT_SERVICE_ACCOUNT = Path(__file__).resolve().parents[4] / "speech-processing-prod-9ffbefa55e2c.json"


def _ensure_credentials_path() -> Optional[str]:
    """Ensure GOOGLE_APPLICATION_CREDENTIALS is set, using local json as fallback."""
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path and Path(credentials_path).exists():
        return credentials_path

    if DEFAULT_SERVICE_ACCOUNT.exists():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(DEFAULT_SERVICE_ACCOUNT)
        return str(DEFAULT_SERVICE_ACCOUNT)

    return credentials_path


def _resolve_project_id(credentials_path: Optional[str]) -> Optional[str]:
    """Resolve the Google Cloud project id from environment variables."""
    project_id = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("GCLOUD_PROJECT")
        or os.getenv("GCP_PROJECT_ID")
    )

    if project_id:
        return project_id

    if credentials_path and Path(credentials_path).exists():
        try:
            with open(credentials_path, "r", encoding="utf-8") as file:
                data = json.load(file)
            return data.get("project_id")
        except (OSError, json.JSONDecodeError) as exc:
            logger.error("Failed to read project id from credentials file %s: %s", credentials_path, exc)

    return None


@router.websocket("/transcribe")
async def websocket_transcribe(websocket: WebSocket) -> None:
    """Establish a WebSocket session for audio streaming and transcription."""
    await websocket.accept()

    credentials_path = _ensure_credentials_path()
    project_id = _resolve_project_id(credentials_path)

    if not project_id:
        await websocket.send_json(
            {
                "event": "error",
                "message": (
                    "Unable to determine Google Cloud project id from environment."
                ),
            }
        )
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    loop = asyncio.get_event_loop()
    result_queue: asyncio.Queue[Optional[Dict[str, Any]]] = asyncio.Queue()
    session_context: Dict[str, Dict[str, Any]] = {}
    context_lock = threading.Lock()
    pending_audio_chunks: list[bytes] = []

    def _set_session_context(session_id: str, context: Dict[str, Any]) -> None:
        with context_lock:
            session_context[session_id] = context

    def _pop_session_context(session_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if session_id is None:
            return None
        with context_lock:
            return session_context.pop(session_id, None)

    def _get_session_context(session_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if session_id is None:
            return None
        with context_lock:
            return session_context.get(session_id)

    def _publish_to_backend(result) -> None:
        if not BACKEND_BASE_URL or not result.session_id:
            return

        context = _get_session_context(result.session_id)
        if not context:
            return

        payload = {
            "lecture_id": context.get("lecture_id"),
            "session_id": result.session_id,
            "presentation_id": result.presentation_id,
            "text": result.text,
            "confidence": result.confidence,
            "timestamp": result.timestamp,
            "is_final": result.is_final,
            "slide_number": result.slide_id,
            "slide_score": result.slide_score,
            "slide_confidence": result.slide_confidence,
            "matched_keywords": result.matched_keywords or [],
        }

        headers = {"Content-Type": "application/json"}
        if BACKEND_SERVICE_TOKEN:
            headers["Authorization"] = f"Bearer {BACKEND_SERVICE_TOKEN}"

        try:
            response = requests.post(
                f"{BACKEND_BASE_URL}/api/transcriptions",
                json=payload,
                headers=headers,
                timeout=BACKEND_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error(
                "Failed to publish transcription for session %s: %s",
                result.session_id,
                exc,
            )

    def _handle_result(result) -> None:
        """Thread-safe callback pushing transcription results into the queue."""
        payload = {
            "event": "transcription",
            "result": result.to_dict(),
        }
        loop.call_soon_threadsafe(result_queue.put_nowait, payload)

        if getattr(result, "is_final", False):
            _publish_to_backend(result)

    manager = StreamingSessionManager(
        credentials_path=credentials_path,
        project_id=project_id,
        result_callback=_handle_result,
    )

    session_id: Optional[str] = None
    presentation_id: Optional[str] = None
    session_started = False
    pending_start_config: Optional[Dict[str, Any]] = None

    async def _forward_results() -> None:
        try:
            while True:
                payload = await result_queue.get()
                if payload is None:
                    break
                await websocket.send_json(payload)
        except WebSocketDisconnect:
            pass
        except RuntimeError:
            # WebSocket already closed while shutting down the task.
            pass

    forward_task = asyncio.create_task(_forward_results())

    async def run_blocking(func, *args, **kwargs):
        return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

    async def send_chunk(chunk_bytes: bytes) -> None:
        nonlocal session_started, pending_start_config, session_id, presentation_id

        # 1. Nếu session chưa init (chưa nhận lệnh start), buffer tạm vào list cục bộ
        if session_id is None:
            logger.debug("Buffering audio chunk (%d bytes) locally - session not initialized", len(chunk_bytes))
            pending_audio_chunks.append(chunk_bytes)
            return

        # 2. Gom tất cả audio cần gửi (pending cũ + chunk mới)
        chunks_to_send = []
        if pending_audio_chunks:
            chunks_to_send.extend(pending_audio_chunks)
            pending_audio_chunks.clear()
        chunks_to_send.append(chunk_bytes)

        try:
            # 3. BUFFER FIRST: Đẩy audio vào Queue của Session Manager trước
            # Việc này an toàn vì create_session đã set status='INITIALIZING',
            # cho phép send_audio_chunk hoạt động.
            for chunk in chunks_to_send:
                # Chạy trong executor để không block async loop
                await run_blocking(manager.send_audio_chunk, session_id, chunk)
            
            # 4. START SECOND: Khởi động gRPC Stream sau khi queue đã có dữ liệu
            if not session_started and pending_start_config is not None:
                logger.info(
                    "Starting session %s after buffering %d chunks",
                    session_id, len(chunks_to_send)
                )
                await run_blocking(
                    manager.start_session,
                    session_id,
                    **pending_start_config,
                )
                
                # Thông báo cho Client biết session đã bắt đầu nhận dạng
                await websocket.send_json(
                    {
                        "event": "session_started",
                        "session_id": session_id,
                        "presentation_id": presentation_id,
                        "language_code": pending_start_config.get("language_code"),
                        "model": pending_start_config.get("model"),
                    }
                )
                session_started = True
                pending_start_config = None

        except Exception as exc:
            # Xử lý lỗi gRPC hoặc Logic
            error_msg = f"Failed to process audio stream: {str(exc)}"
            logger.error("Session %s error: %s", session_id, error_msg)
            
            await websocket.send_json({"event": "error", "message": error_msg})
            
            # Reset state để có thể thử lại nếu client muốn
            session_started = False
            # Lưu ý: Không clear pending_start_config để có thể retry start
            # Nhưng clear buffer audio để tránh tắc nghẽn bộ nhớ
            pending_audio_chunks.clear()
            logger.error("Failed sending chunk for session %s: %s", session_id, exc)

    try:
        while True:
            message = await websocket.receive()
            msg_type = message.get("type")

            if msg_type == "websocket.disconnect":
                break

            if "text" in message and message["text"] is not None:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    await websocket.send_json(
                        {"event": "error", "message": "JSON payload is invalid."}
                    )
                    continue

                action = data.get("action")
                if action == "start":
                    if session_id is not None:
                        await websocket.send_json(
                            {
                                "event": "error",
                                "message": "A session is already active; stop it first.",
                            }
                        )
                        continue

                    session_id = data.get("session_id") or uuid.uuid4().hex
                    presentation_id = data.get("presentation_id") or session_id
                    lecture_id = data.get("lecture_id")
                    if lecture_id is None:
                        await websocket.send_json(
                            {
                                "event": "error",
                                "message": "lecture_id is required to start transcription.",
                            }
                        )
                        session_id = None
                        continue

                    language_code = data.get("language_code", "ja-JP")
                    model = data.get("model", "latest_long")
                    enable_interim = data.get("enable_interim_results", True)

                    try:
                        await run_blocking(
                            manager.create_session,
                            session_id=session_id,
                            presentation_id=presentation_id,
                            language_code=language_code,
                            model=model,
                            enable_interim_results=enable_interim,
                        )
                    except Exception as exc:  # pragma: no cover - gRPC errors
                        session_id = None
                        await websocket.send_json(
                            {
                                "event": "error",
                                "message": f"Failed to start session: {exc}",
                            }
                        )
                        continue

                    _set_session_context(
                        session_id,
                        {
                            "lecture_id": lecture_id,
                            "presentation_id": presentation_id,
                            "language_code": language_code,
                        },
                    )
                    pending_start_config = {
                        "language_code": language_code,
                        "model": model,
                        "enable_interim_results": enable_interim,
                    }
                    session_started = False

                    # Replay any buffered chunks (if audio arrived before "start" message)
                    # Note: We manually manage the list here to avoid iteration issues,
                    # then let send_chunk process each chunk. send_chunk will check
                    # pending_audio_chunks again (now empty) and process only the current chunk.
                    if pending_audio_chunks:
                        logger.info(
                            "Replaying %d buffered chunks for session %s before starting gRPC stream",
                            len(pending_audio_chunks),
                            session_id,
                        )
                        # Copy and clear to avoid iteration issues, then process each chunk
                        buffered_chunks = pending_audio_chunks.copy()
                        pending_audio_chunks.clear()
                        for buffered_chunk in buffered_chunks:
                            await send_chunk(buffered_chunk)
                            logger.debug(
                                "Flushed buffered chunk (%d bytes) for session %s prior to start",
                                len(buffered_chunk),
                                session_id,
                            )

                elif action == "stop":
                    if session_id is None:
                        await websocket.send_json(
                            {
                                "event": "error",
                                "message": "No active session to close.",
                            }
                        )
                        continue

                    try:
                        summary = await run_blocking(
                            manager.close_session,
                            session_id,
                        )
                    except Exception as exc:  # pragma: no cover - gRPC errors
                        await websocket.send_json(
                            {
                                "event": "error",
                                "message": f"Failed to close session: {exc}",
                            }
                        )
                        session_id = None
                        continue

                    await websocket.send_json(
                        {
                            "event": "session_closed",
                            "session_id": session_id,
                            "summary": summary,
                        }
                    )
                    _pop_session_context(session_id)
                    session_id = None
                    session_started = False
                    pending_start_config = None
                    pending_audio_chunks.clear()

                else:
                    await websocket.send_json(
                            {
                                "event": "error",
                                "message": f"Unsupported action: {action}",
                            }
                    )

            elif "bytes" in message and message["bytes"] is not None:
                chunk_data = message["bytes"]
                if isinstance(chunk_data, memoryview):
                    chunk_bytes = chunk_data.tobytes()
                else:
                    chunk_bytes = bytes(chunk_data)

                if session_id is None:
                    pending_audio_chunks.append(chunk_bytes)
                    continue

                await send_chunk(chunk_bytes)

    except WebSocketDisconnect:
        pass
    finally:
        if session_id is not None:
            try:
                await run_blocking(manager.close_session, session_id)
            except Exception:
                pass
        _pop_session_context(session_id)
        session_id = None
        session_started = False
        pending_start_config = None
        pending_audio_chunks.clear()
        await result_queue.put(None)
        with contextlib.suppress(asyncio.CancelledError):
            await forward_task


