# API Guide - Hướng Dẫn Sử Dụng

**Base URL:** `http://localhost:8000`

---

## 1. Slide Processing API

### POST `/slides/upload`

Upload PDF và xử lý trực tiếp.

**Request:** `multipart/form-data`
- `file` (required): PDF file
- `presentation_id` (optional): Presentation ID
- `use_embeddings` (optional, default: `true`): Generate embeddings

**Response:**
```json
{
  "filename": "presentation.pdf",
  "presentation_id": "pres-123",
  "slide_count": 10,
  "keywords_count": 150,
  "has_embeddings": true,
  "all_summary": "=== DOCUMENT CONTENT START ===\n[Page 1]\n...",
  "slides": [
    {
      "slide_id": 1,
      "title": "Introduction",
      "headings": ["Overview"],
      "bullets": ["Point 1"],
      "body": ["Body text..."],
      "keywords": ["keyword1"],
      "all_text": "Full text",
      "summary": "NLP-processed summary"
    }
  ]
}
```

### POST `/slides/process`

Xử lý PDF từ Google Cloud Storage.

**Request:**
```json
{
  "lecture_id": 123,
  "gcs_uri": "gs://bucket-name/path/to/file.pdf",
  "original_name": "presentation.pdf",
  "use_embeddings": true
}
```

**Response:** Giống như `/slides/upload`

---

## 2. Context Extraction API

Tìm các khoảnh khắc giảng dạy quan trọng từ transcript.

### POST `/analytics/context-extraction`

**Request:**
```json
{
  "presentation_id": "pres-123",
  "segments": [
    {
      "text": "これは重要な説明です。つまり、概念を理解する必要があります。",
      "start_time": 0.0,
      "end_time": 5.0,
      "confidence": 0.95,
      "word_count": 15,
      "slide_id": 1,
      "matched_keywords": ["重要", "概念", "理解"]
    }
  ],
  "slide_transitions": [{"timestamp": 10.0, "slide_id": 2}],
  "min_importance_threshold": 30.0
}
```

**Response:**
```json
{
  "presentation_id": "pres-123",
  "total_contexts": 1,
  "contexts": [
    {
      "context_id": "uuid",
      "start_time": 0.0,
      "end_time": 5.0,
      "slide_page": 1,
      "text": "...",
      "context_type": "explanation",
      "importance_score": 75.5,
      "keywords_matched": ["重要", "概念"],
      "teacher_notes": "",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "statistics": {
    "total_contexts": 1,
    "by_type": {"explanation": 1},
    "avg_importance": 75.5
  }
}
```

**Context Types:** `explanation`, `emphasis`, `example`, `summary`, `question`, `mixed`

### Export Endpoints

- `POST /analytics/context-extraction/export/json` - JSON format
- `POST /analytics/context-extraction/export/text` - Text report
- `POST /analytics/context-extraction/export/html?total_duration=3600.0` - HTML timeline

---

## 3. Intention Analysis API

Phân tích ý định giảng dạy từ transcript (phân tích TẤT CẢ segments).

### POST `/analytics/intention-analysis`

**Request:**
```json
{
  "presentation_id": "pres-123",
  "segments": [
    {
      "text": "これは重要な説明です。つまり、概念を理解する必要があります。",
      "start_time": 0.0,
      "end_time": 5.0,
      "word_count": 15,
      "slide_id": 1,
      "matched_keywords": ["重要", "概念"]
    }
  ],
  "slide_transitions": [{"timestamp": 10.0, "slide_id": 2}]
}
```

**Lưu ý:** Gửi **TẤT CẢ segments** (không filter), system sẽ tự phân tích.

**Response:**
```json
{
  "presentation_id": "pres-123",
  "total_segments": 1,
  "segments": [
    {
      "segment_id": "uuid",
      "text": "...",
      "start_time": 0.0,
      "end_time": 5.0,
      "slide_page": 1,
      "intention_category": "explanation",
      "confidence_score": 0.85,
      "key_phrases": ["つまり", "重要"],
      "word_count": 15
    }
  ],
  "statistics": {
    "total_segments": 1,
    "total_duration": 5.0,
    "by_category": {
      "explanation": {"count": 1, "duration": 5.0, "percentage": 100.0},
      "emphasis": {"count": 0, "duration": 0.0, "percentage": 0.0},
      "example": {"count": 0, "duration": 0.0, "percentage": 0.0},
      "comparison": {"count": 0, "duration": 0.0, "percentage": 0.0},
      "warning": {"count": 0, "duration": 0.0, "percentage": 0.0},
      "summary": {"count": 0, "duration": 0.0, "percentage": 0.0},
      "mixed": {"count": 0, "duration": 0.0, "percentage": 0.0}
    },
    "timeline": [
      {
        "start_time": 0.0,
        "end_time": 5.0,
        "category": "explanation",
        "confidence": 0.85,
        "slide_page": 1
      }
    ]
  }
}
```

**Intention Categories:** `explanation`, `emphasis`, `example`, `comparison`, `warning`, `summary`, `mixed`

---

## 4. WebSocket Streaming API

### WS `/ws/transcribe`

Real-time speech-to-text streaming.

**Start Session:**
```json
{
  "action": "start",
  "lecture_id": 123,
  "language_code": "ja-JP",
  "model": "latest_long",
  "enable_interim_results": true
}
```

**Audio Format:**
- Encoding: LINEAR16 (16-bit PCM, little-endian)
- Sample Rate: 16000 Hz
- Channels: Mono (1)
- Chunk Size: 3200-9600 bytes

**Server Messages:**
- `session_started` - Session đã bắt đầu
- `transcription` - Kết quả transcription
- `session_closed` - Session đã đóng
- `error` - Lỗi

---

## 5. So Sánh: Context Extraction vs Intention Analysis

| | Context Extraction | Intention Analysis |
|---|---|---|
| **Mục đích** | Tìm khoảnh khắc quan trọng | Phân tích teaching style |
| **Input** | Segments có importance cao | **TẤT CẢ segments** |
| **Output** | `context_type` + `importance_score` | `intention_category` + `confidence_score` |
| **Use case** | "What is important?" | "What is the teaching intention?" |

**Kết hợp:** Dùng Context Extraction để tìm important moments, Intention Analysis để phân tích toàn bộ teaching style.

---

## 6. Ví Dụ Code

### TypeScript (Frontend)

```typescript
// Context Extraction
async function extractContexts(presentationId: string, segments: any[]) {
  const response = await fetch('http://localhost:8000/analytics/context-extraction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      presentation_id: presentationId,
      segments,
      min_importance_threshold: 30.0,
    }),
  });
  return await response.json();
}

// Intention Analysis
async function analyzeIntentions(presentationId: string, segments: any[]) {
  const response = await fetch('http://localhost:8000/analytics/intention-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      presentation_id: presentationId,
      segments,
    }),
  });
  return await response.json();
}
```

### Java (Backend)

```java
@Service
public class AnalyticsService {
    @Value("${speech-to-text.api.url:http://localhost:8000}")
    private String apiUrl;
    
    @Autowired
    private RestTemplate restTemplate;
    
    public ContextExtractionResponse extractContexts(
            String presentationId, List<Segment> segments) {
        String url = apiUrl + "/analytics/context-extraction";
        ContextExtractionRequest request = new ContextExtractionRequest();
        request.setPresentationId(presentationId);
        request.setSegments(segments);
        
        return restTemplate.postForObject(url, request, ContextExtractionResponse.class);
    }
    
    public IntentionAnalysisResponse analyzeIntentions(
            String presentationId, List<Segment> segments) {
        String url = apiUrl + "/analytics/intention-analysis";
        IntentionAnalysisRequest request = new IntentionAnalysisRequest();
        request.setPresentationId(presentationId);
        request.setSegments(segments);
        
        return restTemplate.postForObject(url, request, IntentionAnalysisResponse.class);
    }
}
```

---

## 7. Segment Structure

Cả Context Extraction và Intention Analysis đều dùng cùng segment format:

```json
{
  "text": "string",              // Bắt buộc
  "start_time": 0.0,             // Bắt buộc (giây)
  "end_time": 5.0,               // Bắt buộc (giây)
  "word_count": 15,              // Optional (tự động tính)
  "slide_id": 1,                 // Optional
  "matched_keywords": ["kw1"],   // Optional
  "confidence": 0.95             // Chỉ cho Context Extraction
}
```

---

## 8. Best Practices

1. **Context Extraction:**
   - Chỉ gửi segments có confidence cao (>0.8)
   - Cung cấp `slide_transitions` để tăng độ chính xác
   - Điều chỉnh `min_importance_threshold` theo nhu cầu (30.0 = default)

2. **Intention Analysis:**
   - Gửi **TẤT CẢ segments** (không filter)
   - Cung cấp `slide_transitions` để tính structural position
   - Include `matched_keywords` để tăng keyword density factor

3. **Chung:**
   - Sử dụng `statistics` để phân tích kết quả
   - Cache kết quả nếu segments không đổi
   - Xử lý errors gracefully

---

## 9. OpenAPI Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

---

## Tóm Tắt Endpoints

### Slide Processing
- `POST /slides/upload` - Upload PDF
- `POST /slides/process` - Process từ GCS

### Analytics
- `POST /analytics/context-extraction` - Extract contexts
- `POST /analytics/context-extraction/export/json` - Export JSON
- `POST /analytics/context-extraction/export/text` - Export text
- `POST /analytics/context-extraction/export/html` - Export HTML
- `POST /analytics/intention-analysis` - Analyze intentions

### Streaming
- `WS /ws/transcribe` - Real-time transcription

---

## Error Handling

- `200 OK`: Thành công
- `400 Bad Request`: Request không hợp lệ
- `404 Not Found`: Resource không tìm thấy
- `500 Internal Server Error`: Lỗi server

Error response format:
```json
{
  "detail": "Error message here"
}
```

