"""
Simple proxy endpoint for Google Speech-to-Text streaming.
Based on working demo code - uses SpeechAsyncClient for better async support.
"""

import asyncio
import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.cloud import speech

router = APIRouter()
logger = logging.getLogger(__name__)

# Path to credentials file - try multiple locations
def find_credentials_file():
    """Find credentials file in multiple possible locations."""
    # 1. Check environment variable first
    env_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if env_path and Path(env_path).exists():
        return str(Path(env_path))
    
    # 2. Try current project directory
    current_dir = Path(__file__).resolve().parents[4] / "speech-processing-prod-9ffbefa55e2c.json"
    if current_dir.exists():
        return str(current_dir)
    
    # 3. Try user-specified path
    user_path = Path("/home/sagiri/Code/python/speech-to-text/speech-processing-prod-9ffbefa55e2c.json")
    if user_path.exists():
        return str(user_path)
    
    # 4. Try in speech-to-text directory (current project)
    project_path = Path(__file__).resolve().parents[3] / "speech-processing-prod-9ffbefa55e2c.json"
    if project_path.exists():
        return str(project_path)
    
    # 5. Try google-credentials.json in project root
    creds_file = Path(__file__).resolve().parents[4] / "google-credentials.json"
    if creds_file.exists():
        return str(creds_file)
    
    return None

# Set credentials before importing client
credentials_path = find_credentials_file()
if credentials_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
    logger.info(f"Using credentials: {credentials_path}")
else:
    logger.warning("Credentials file not found, will use default or environment variable")

# Cấu hình Audio chuẩn
SAMPLE_RATE = 16000
CHUNK_SIZE = int(SAMPLE_RATE / 10)  # 100ms

# Sử dụng ASYNC Client để tránh bị block luồng
client = speech.SpeechAsyncClient()


@router.websocket("/speech-stream")
async def speech_stream_proxy(websocket: WebSocket):
    """
    Simple WebSocket proxy for Google Speech-to-Text streaming.
    Based on working demo code - uses async pattern.
    """
    await websocket.accept()
    logger.info("Client connected to speech proxy")

    try:
        # BƯỚC 1: Nhận cấu hình ngôn ngữ từ Frontend trước khi stream audio
        config_data = await websocket.receive_json()
        language_code = config_data.get("language", "ja-JP")
        logger.info(f"Selected Language: {language_code}")

        # Cấu hình nhận diện
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=SAMPLE_RATE,
            language_code=language_code,
            enable_automatic_punctuation=True,
        )
        
        streaming_config = speech.StreamingRecognitionConfig(
            config=config,
            interim_results=True
        )

        # BƯỚC 2: Tạo Generator để gửi dữ liệu lên Google
        async def request_generator():
            # Gửi cấu hình ban đầu
            yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)
            
            # Vòng lặp nhận audio từ WebSocket và gửi lên Google
            while True:
                try:
                    # Kiểm tra WebSocket state trước khi receive
                    if websocket.client_state.name != "CONNECTED":
                        logger.info("WebSocket not connected, stopping generator")
                        break
                    
                    # Nhận dữ liệu từ WebSocket (có thể là bytes hoặc text)
                    message = await websocket.receive()
                    
                    # Kiểm tra nếu là bytes
                    if "bytes" in message:
                        data = message["bytes"]
                        # Convert memoryview to bytes if needed
                        if isinstance(data, memoryview):
                            data = data.tobytes()
                        elif not isinstance(data, bytes):
                            data = bytes(data)
                        
                        # Validate và đảm bảo even bytes
                        if len(data) > 0:
                            if len(data) % 2 != 0:
                                data = data + b'\x00'
                            yield speech.StreamingRecognizeRequest(audio_content=data)
                    # Ignore text messages (already handled language config)
                    elif "text" in message:
                        continue
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected in generator")
                    break
                except RuntimeError as e:
                    # Handle "Cannot call receive once disconnect" error
                    if "disconnect" in str(e).lower():
                        logger.info("WebSocket disconnected (RuntimeError)")
                        break
                    raise
                except Exception as e:
                    logger.error(f"Error in generator: {e}", exc_info=True)
                    break

        # BƯỚC 3: Xử lý phản hồi từ Google
        # Hàm streaming_recognize của AsyncClient trả về một AsyncIterator
        responses = await client.streaming_recognize(requests=request_generator())

        async for response in responses:
            # Kiểm tra WebSocket state trước khi send
            if websocket.client_state.name != "CONNECTED":
                logger.info("WebSocket disconnected, stopping response processing")
                break
                
            if not response.results:
                continue

            result = response.results[0]
            if not result.alternatives:
                continue

            transcript = result.alternatives[0].transcript
            is_final = result.is_final

            # Gửi kết quả về lại Frontend
            try:
                await websocket.send_json({
                    "transcript": transcript,
                    "is_final": is_final
                })
            except Exception as send_error:
                logger.warning(f"Failed to send result: {send_error}")
                break

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Server Error: {e}", exc_info=True)
        # Nếu connection còn mở thì gửi lỗi về
        try:
            if websocket.client_state.name == "CONNECTED":
                await websocket.send_json({"error": str(e)})
        except:
            pass

