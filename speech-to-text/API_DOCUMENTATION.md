# API Documentation

## Base URL

```
http://localhost:8000
```

---

## 1. Slide Processing API

### 1.1. Upload and Process PDF Slide Deck

**Endpoint:** `POST /slides/upload`

**Description:** Upload a PDF file directly and process it to extract slide content, keywords, and generate embeddings. The response includes `all_summary` - a global NLP-processed summary of all slides.

**Request:**

- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `file` (required, file): PDF file to upload
  - `presentation_id` (optional, string): Presentation identifier
  - `use_embeddings` (optional, boolean, default: `true`): Whether to generate embeddings

**Response:** `200 OK`

```json
{
  "filename": "presentation.pdf",
  "presentation_id": "pres-123",
  "statistics": {
    "slide_count": 10,
    "keywords_count": 150,
    "has_embeddings": true,
    "processing_time": 5.2
  },
  "slides": [
    {
      "slide_id": 1,
      "title": "Introduction",
      "headings": ["Overview", "Objectives"],
      "bullets": ["Point 1", "Point 2"],
      "body": ["Body text content..."],
      "keywords": ["keyword1", "keyword2"],
      "all_text": "Full extracted text from slide",
      "summary": "NLP-processed semantic summary"
    }
  ],
  "keywords_count": 150,
  "slide_count": 10,
  "has_embeddings": true,
  "all_summary": "=== DOCUMENT CONTENT START ===\n[Page 1]\nIntroduction. Overview. Objectives. Point 1. Point 2.\n[Page 2]\n..."
}
```

**Error Responses:**

- `400 Bad Request`: Invalid file type or processing error
- `500 Internal Server Error`: Server error

---

### 1.2. Process Slide Deck from GCS

**Endpoint:** `POST /slides/process`

**Description:** Process a PDF slide deck stored in Google Cloud Storage (GCS) and return structured data. The response includes `all_summary` - a global NLP-processed summary of all slides.

**Request Body:**

```json
{
  "lecture_id": 123,
  "gcs_uri": "gs://bucket-name/path/to/file.pdf",
  "original_name": "presentation.pdf",
  "use_embeddings": true
}
```

**Request Schema:**

- `lecture_id` (required, integer): Lecture identifier
- `gcs_uri` (required, string): GCS URI in format `gs://bucket/object`
- `original_name` (optional, string): Original filename
- `use_embeddings` (optional, boolean, default: `true`): Whether to generate embeddings

**Response:** `200 OK`

```json
{
  "lecture_id": 123,
  "original_name": "presentation.pdf",
  "slide_count": 10,
  "keywords_count": 150,
  "has_embeddings": true,
  "all_summary": "=== DOCUMENT CONTENT START ===\n[Page 1]\nIntroduction. Overview. Objectives. Point 1. Point 2.\n[Page 2]\n...",
  "slides": [
    {
      "slide_id": 1,
      "title": "Introduction",
      "headings": ["Overview", "Objectives"],
      "bullets": ["Point 1", "Point 2"],
      "body": ["Body text content..."],
      "keywords": ["keyword1", "keyword2"],
      "all_text": "Full extracted text from slide",
      "summary": "NLP-processed semantic summary"
    }
  ]
}
```

**Response Schema:**

**SlideProcessingResponse:**

- `lecture_id` (integer): Lecture identifier
- `original_name` (string, nullable): Original filename
- `slide_count` (integer): Total number of slides processed
- `keywords_count` (integer): Total unique keywords extracted
- `has_embeddings` (boolean): Whether embeddings were generated
- `all_summary` (string): Global summary of all slides processed by NLP (spaCy/GiNZA). Contains all slide summaries concatenated with page markers. Format: `"=== DOCUMENT CONTENT START ===\n[Page N]\n<slide summary>\n[Page N+1]\n<slide summary>..."`. Each slide summary is processed using spaCy/GiNZA for intelligent text reconstruction and semantic summarization.
- `slides` (array of SlideDetails): List of processed slides

**SlideDetails:**

- `slide_id` (integer): Slide page number (1-indexed)
- `title` (string, nullable): Slide title
- `headings` (array of strings): List of headings extracted from slide
- `bullets` (array of strings): List of bullet points
- `body` (array of strings): List of body text blocks
- `keywords` (array of strings): Extracted keywords for matching
- `all_text` (string): Full raw text extracted from slide
- `summary` (string): NLP-processed semantic summary (using spaCy/GiNZA)

**Error Responses:**

- `400 Bad Request`: Invalid GCS URI or processing error
- `404 Not Found`: GCS object not found
- `502 Bad Gateway`: GCS access error
- `500 Internal Server Error`: Server error

---

## 2. Real-time Speech-to-Text Streaming API

### 2.1. WebSocket Transcription Endpoint

**Endpoint:** `WS /ws/transcribe`

**Description:** Establish a WebSocket connection for real-time audio streaming and transcription with automatic slide matching.

**Connection:**

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/transcribe");
```

---

### 2.2. Client Messages (JSON)

#### 2.2.1. Start Session

**Action:** `start`

**Message:**

```json
{
  "action": "start",
  "session_id": "session-123",
  "presentation_id": "pres-123",
  "lecture_id": 123,
  "language_code": "ja-JP",
  "model": "latest_long",
  "enable_interim_results": true
}
```

**Parameters:**

- `action` (required, string): Must be `"start"`
- `session_id` (optional, string): Session identifier (auto-generated if not provided)
- `presentation_id` (optional, string): Presentation identifier (defaults to `session_id`)
- `lecture_id` (required, integer): Lecture identifier
- `language_code` (optional, string, default: `"ja-JP"`): Language code for transcription
- `model` (optional, string, default: `"latest_long"`): Google Cloud Speech-to-Text model
- `enable_interim_results` (optional, boolean, default: `true`): Enable interim (partial) results

**Server Response:**

**Note:** `session_started` event is sent **after** the first audio chunk is processed, not immediately after the `start` message. This is by design to ensure the audio queue has data before the gRPC stream starts (Buffer First, Start Second pattern).

```json
{
  "event": "session_started",
  "session_id": "session-123",
  "presentation_id": "pres-123",
  "language_code": "ja-JP",
  "model": "latest_long"
}
```

---

#### 2.2.2. Stop Session

**Action:** `stop`

**Message:**

```json
{
  "action": "stop"
}
```

**Server Response:**

```json
{
  "event": "session_closed",
  "session_id": "session-123",
  "summary": {
    "session_id": "session-123",
    "presentation_id": "pres-123",
    "created_at": "2024-01-01T00:00:00Z",
    "duration": 300.5,
    "status": "COMPLETED",
    "renewal_count": 0,
    "total_chunks_sent": 1500,
    "total_bytes_sent": 4800000,
    "time_since_last_audio": 0.5
  }
}
```

---

### 2.3. Audio Streaming (Binary)

**Format:** After sending `start` message, send audio chunks as binary WebSocket messages.

**Audio Format Requirements:**

- **Encoding:** LINEAR16 (16-bit PCM, little-endian)
- **Sample Rate:** 16000 Hz
- **Channels:** Mono (1 channel)
- **Chunk Size:** Recommended 3200-9600 bytes per chunk
- **Header:** WAV headers are automatically detected and removed by server

**Note:** Server automatically handles:

- Small chunk buffering (< 3200 bytes)
- WAV header detection and removal
- Large chunk splitting (> 9600 bytes)

---

### 2.4. Server Messages (JSON)

#### 2.4.1. Transcription Result

**Event:** `transcription`

**Message:**

```json
{
  "event": "transcription",
  "result": {
    "text": "こんにちは、今日は良い天気ですね",
    "is_final": true,
    "confidence": 0.95,
    "timestamp": 1704067200.5,
    "words": [
      {
        "word": "こんにちは",
        "start_time": 0.0,
        "end_time": 0.5,
        "confidence": 0.98
      }
    ],
    "session_id": "session-123",
    "presentation_id": "pres-123",
    "slide": {
      "slide_id": 1,
      "score": 0.85,
      "confidence": 0.9,
      "matched_keywords": ["こんにちは", "天気"]
    }
  }
}
```

**Result Schema:**

- `text` (string): Transcribed text
- `is_final` (boolean): `true` for final results, `false` for interim (partial) results
- `confidence` (float): Confidence score (0.0 to 1.0)
- `timestamp` (float): Unix timestamp of result
- `words` (array of objects): Word-level timing and confidence (if available)
- `session_id` (string): Session identifier
- `presentation_id` (string): Presentation identifier
- `slide` (object, optional): Slide matching information
  - `slide_id` (integer): Matched slide page number
  - `score` (float): Matching score (0.0 to 1.0)
  - `confidence` (float): Matching confidence (0.0 to 1.0)
  - `matched_keywords` (array of strings): Keywords that matched

**Note:**

- Final results are automatically published to backend API at `/api/transcriptions` (if configured).
- `session_started` event is sent **after** the first audio chunk is processed (not immediately after `start` message). This ensures the audio queue has data before the gRPC stream starts.

---

#### 2.4.2. Session Started

**Event:** `session_started`

**Message:**

```json
{
  "event": "session_started",
  "session_id": "session-123",
  "presentation_id": "pres-123",
  "language_code": "ja-JP",
  "model": "latest_long"
}
```

---

#### 2.4.3. Session Closed

**Event:** `session_closed`

**Message:**

```json
{
  "event": "session_closed",
  "session_id": "session-123",
  "summary": {
    "session_id": "session-123",
    "presentation_id": "pres-123",
    "created_at": "2024-01-01T00:00:00Z",
    "duration": 300.5,
    "status": "COMPLETED",
    "renewal_count": 0,
    "total_chunks_sent": 1500,
    "total_bytes_sent": 4800000,
    "time_since_last_audio": 0.5
  }
}
```

---

#### 2.4.4. Error

**Event:** `error`

**Message:**

```json
{
  "event": "error",
  "message": "Error description here"
}
```

**Common Errors:**

- `"lecture_id is required to start transcription."`
- `"A session is already active; stop it first."`
- `"No active session to close."`
- `"Unable to determine Google Cloud project id from environment."`
- `"Failed to start session: <error details>"`
- `"Failed to process audio stream: <error details>"`
- `"JSON payload is invalid."`
- `"Unsupported action: <action>"`

---

## 3. Backend Callback (Automatic)

When final transcription results are received, the service automatically publishes them to the backend API:

**Endpoint:** `POST {BACKEND_BASE_URL}/api/transcriptions`

**Headers:**

- `Content-Type: application/json`
- `Authorization: Bearer {BACKEND_SERVICE_TOKEN}` (if configured)

**Payload:**

```json
{
  "lecture_id": 123,
  "session_id": "session-123",
  "presentation_id": "pres-123",
  "text": "Transcribed text",
  "confidence": 0.95,
  "timestamp": 1704067200.5,
  "is_final": true,
  "slide_number": 1,
  "slide_score": 0.85,
  "slide_confidence": 0.9,
  "matched_keywords": ["keyword1", "keyword2"]
}
```

**Configuration:**

- `BACKEND_BASE_URL`: Backend API base URL (default: `http://localhost:8080`)
- `BACKEND_SERVICE_TOKEN`: Authentication token (optional)
- `BACKEND_CALLBACK_TIMEOUT`: Request timeout in seconds (default: `5`)

---

## 4. Example Usage

### 4.1. JavaScript/TypeScript WebSocket Client

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/transcribe");

ws.onopen = () => {
  // Start session
  ws.send(
    JSON.stringify({
      action: "start",
      lecture_id: 123,
      language_code: "ja-JP",
      model: "latest_long",
      enable_interim_results: true,
    })
  );
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.event === "transcription") {
    const result = data.result;
    console.log(`[${result.is_final ? "FINAL" : "INTERIM"}] ${result.text}`);

    if (result.slide) {
      console.log(
        `Matched slide ${result.slide.slide_id} (score: ${result.slide.score})`
      );
    }
  } else if (data.event === "session_started") {
    console.log("Session started:", data.session_id);
    // Start sending audio chunks
    startAudioStream(ws);
  } else if (data.event === "error") {
    console.error("Error:", data.message);
  }
};

function startAudioStream(ws) {
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      // Convert to LINEAR16 format and send
      const linear16Audio = convertToLinear16(event.data);
      ws.send(linear16Audio);
    }
  };

  mediaRecorder.start(100); // Send chunks every 100ms
}

ws.onclose = () => {
  console.log("WebSocket closed");
};
```

### 4.2. Python Client Example

```python
import asyncio
import websockets
import json
import wave

async def transcribe_audio():
    uri = "ws://localhost:8000/ws/transcribe"

    async with websockets.connect(uri) as websocket:
        # Start session
        await websocket.send(json.dumps({
            "action": "start",
            "lecture_id": 123,
            "language_code": "ja-JP",
            "model": "latest_long",
            "enable_interim_results": True
        }))

        # Wait for session_started
        response = await websocket.recv()
        data = json.loads(response)
        print(f"Session started: {data['session_id']}")

        # Send audio chunks
        with wave.open("audio.wav", "rb") as wav_file:
            # Remove WAV header and send raw PCM data
            wav_file.setpos(0)
            frames = wav_file.readframes(1600)  # 100ms at 16kHz

            while frames:
                await websocket.send(frames)
                frames = wav_file.readframes(1600)

                # Receive transcription results
                try:
                    result = await asyncio.wait_for(websocket.recv(), timeout=0.1)
                    data = json.loads(result)
                    if data.get("event") == "transcription":
                        print(f"Text: {data['result']['text']}")
                except asyncio.TimeoutError:
                    pass

        # Stop session
        await websocket.send(json.dumps({"action": "stop"}))
        response = await websocket.recv()
        print(f"Session closed: {json.loads(response)}")

asyncio.run(transcribe_audio())
```

---

## 5. Error Handling

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters or data
- `404 Not Found`: Resource not found (e.g., GCS object)
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: External service error (e.g., GCS access)

### WebSocket Status Codes

- `1000`: Normal closure
- `1011`: Internal server error (e.g., missing Google Cloud credentials)

---

## 6. Rate Limits and Constraints

### Audio Streaming

- **Maximum session duration:** 5 minutes (300 seconds) of continuous audio
- **Maximum silence duration:** 1 minute (60 seconds)
- **Automatic renewal:** Sessions are automatically renewed at 4.5 minutes (270 seconds)
- **Chunk size:** Recommended 3200-9600 bytes per chunk
- **Minimum chunk size:** 3200 bytes (smaller chunks are buffered automatically)

### Slide Processing

- **File size:** Limited by available memory and processing time
- **Processing time:** Varies based on PDF complexity and number of pages
- **Embeddings:** Generation time depends on content length

---

## 7. Environment Variables

### Required

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account JSON file
- `GOOGLE_CLOUD_PROJECT` (or `GCLOUD_PROJECT` or `GCP_PROJECT_ID`): Google Cloud project ID

### Optional

- `BACKEND_BASE_URL`: Backend API base URL (default: `http://localhost:8080`)
- `BACKEND_SERVICE_TOKEN`: Authentication token for backend callbacks
- `BACKEND_CALLBACK_TIMEOUT`: Backend callback timeout in seconds (default: `5`)

---

## 8. OpenAPI/Swagger Documentation

FastAPI automatically generates OpenAPI documentation. Access it at:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`
