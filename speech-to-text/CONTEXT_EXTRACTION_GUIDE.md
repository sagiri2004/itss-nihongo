# Context Extraction API - Hướng Dẫn Sử Dụng

## Tổng Quan

Context Extraction System tự động phân tích transcript để tìm các khoảnh khắc giảng dạy quan trọng (explanations, emphasis, examples, summaries, questions).

**Base URL:** `http://localhost:8000/analytics`

---

## 1. API Endpoint Chính

### POST `/analytics/context-extraction`

Phân tích transcript và trả về danh sách contexts đã được phân loại.

#### Request Body

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
      "matched_keywords": ["重要", "概念", "理解", "説明"]
    },
    {
      "text": "短いセグメント",
      "start_time": 5.0,
      "end_time": 6.0,
      "confidence": 0.8,
      "word_count": 2,
      "slide_id": 1,
      "matched_keywords": []
    }
  ],
  "slide_transitions": [
    {
      "timestamp": 10.0,
      "slide_id": 2
    },
    {
      "timestamp": 20.0,
      "slide_id": 3
    }
  ],
  "min_importance_threshold": 30.0
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `presentation_id` | string | ✅ | ID của presentation |
| `segments` | array | ✅ | Danh sách transcript segments |
| `slide_transitions` | array | ❌ | Danh sách thời điểm chuyển slide (để tăng độ chính xác) |
| `min_importance_threshold` | float | ❌ | Ngưỡng importance tối thiểu (0-100, mặc định: 30.0) |

#### Segment Structure

Mỗi segment cần có:

```json
{
  "text": "string",              // Nội dung transcript
  "start_time": 0.0,             // Thời gian bắt đầu (giây)
  "end_time": 5.0,               // Thời gian kết thúc (giây)
  "confidence": 0.95,            // Độ tin cậy (0.0-1.0)
  "word_count": 15,              // Số từ (tự động tính nếu không có)
  "slide_id": 1,                 // ID slide (optional)
  "matched_keywords": ["kw1"]    // Keywords khớp với slide (optional)
}
```

#### Response

```json
{
  "presentation_id": "pres-123",
  "total_contexts": 3,
  "contexts": [
    {
      "context_id": "uuid-here",
      "start_time": 0.0,
      "end_time": 5.0,
      "slide_page": 1,
      "text": "これは重要な説明です。つまり、概念を理解する必要があります。",
      "context_type": "explanation",
      "importance_score": 75.5,
      "keywords_matched": ["重要", "概念", "理解", "説明"],
      "teacher_notes": "",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "statistics": {
    "total_contexts": 3,
    "by_type": {
      "explanation": 2,
      "emphasis": 1
    },
    "avg_importance": 68.3,
    "total_duration": 15.5
  },
  "generated_at": "2024-01-01T00:00:00Z"
}
```

#### Context Types

- `explanation`: Giải thích, làm rõ ("つまり", "例えば", "なぜなら")
- `emphasis`: Nhấn mạnh ("重要", "注意", "覚えて")
- `example`: Ví dụ cụ thể ("例として", "実際に")
- `summary`: Tóm tắt ("まとめると", "結論", "以上")
- `question`: Câu hỏi ("どう", "なぜ", "何")
- `mixed`: Nhiều loại kết hợp

---

## 2. Export Endpoints

### POST `/analytics/context-extraction/export/json`

Export contexts dưới dạng JSON đầy đủ (bao gồm metadata).

**Request:** Giống như endpoint chính

**Response:** JSON object với `analysis_type`, `generated_at`, `total_contexts`, `contexts`, `statistics`

---

### POST `/analytics/context-extraction/export/text`

Export contexts dưới dạng text report (dễ đọc).

**Request:** Giống như endpoint chính

**Response:**
```json
{
  "format": "text",
  "content": "=== CONTEXT EXTRACTION REPORT ===\n...",
  "generated_at": "2024-01-01T00:00:00Z"
}
```

---

### POST `/analytics/context-extraction/export/html`

Export contexts dưới dạng HTML timeline visualization.

**Request:** Giống như endpoint chính + query parameter:
- `total_duration` (float, optional): Tổng thời lượng recording (giây, mặc định: 3600)

**Response:**
```json
{
  "format": "html",
  "content": "<!DOCTYPE html>...",
  "generated_at": "2024-01-01T00:00:00Z"
}
```

---

## 3. Ví Dụ Sử Dụng

### JavaScript/TypeScript (Frontend)

```typescript
interface Segment {
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  word_count: number;
  slide_id?: number;
  matched_keywords?: string[];
}

interface SlideTransition {
  timestamp: number;
  slide_id: number;
}

async function extractContexts(
  presentationId: string,
  segments: Segment[],
  slideTransitions: SlideTransition[] = []
) {
  const response = await fetch('http://localhost:8000/analytics/context-extraction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      presentation_id: presentationId,
      segments,
      slide_transitions: slideTransitions,
      min_importance_threshold: 30.0,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Sử dụng
const segments = [
  {
    text: "これは重要な説明です",
    start_time: 0.0,
    end_time: 5.0,
    confidence: 0.95,
    word_count: 5,
    slide_id: 1,
    matched_keywords: ["重要", "説明"],
  },
];

const contexts = await extractContexts('pres-123', segments);
console.log(`Found ${contexts.total_contexts} contexts`);
```

### Java (Backend)

```java
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

// Request DTO
public class ContextExtractionRequest {
    @JsonProperty("presentation_id")
    private String presentationId;
    
    @JsonProperty("segments")
    private List<Segment> segments;
    
    @JsonProperty("slide_transitions")
    private List<SlideTransition> slideTransitions;
    
    @JsonProperty("min_importance_threshold")
    private Double minImportanceThreshold = 30.0;
    
    // Getters and setters...
}

public class Segment {
    @JsonProperty("text")
    private String text;
    
    @JsonProperty("start_time")
    private Double startTime;
    
    @JsonProperty("end_time")
    private Double endTime;
    
    @JsonProperty("confidence")
    private Double confidence;
    
    @JsonProperty("word_count")
    private Integer wordCount;
    
    @JsonProperty("slide_id")
    private Integer slideId;
    
    @JsonProperty("matched_keywords")
    private List<String> matchedKeywords;
    
    // Getters and setters...
}

public class SlideTransition {
    @JsonProperty("timestamp")
    private Double timestamp;
    
    @JsonProperty("slide_id")
    private Integer slideId;
    
    // Getters and setters...
}

// Response DTO
public class ContextExtractionResponse {
    @JsonProperty("presentation_id")
    private String presentationId;
    
    @JsonProperty("total_contexts")
    private Integer totalContexts;
    
    @JsonProperty("contexts")
    private List<Context> contexts;
    
    @JsonProperty("statistics")
    private Map<String, Object> statistics;
    
    @JsonProperty("generated_at")
    private String generatedAt;
    
    // Getters and setters...
}

public class Context {
    @JsonProperty("context_id")
    private String contextId;
    
    @JsonProperty("start_time")
    private Double startTime;
    
    @JsonProperty("end_time")
    private Double endTime;
    
    @JsonProperty("slide_page")
    private Integer slidePage;
    
    @JsonProperty("text")
    private String text;
    
    @JsonProperty("context_type")
    private String contextType; // "explanation", "emphasis", etc.
    
    @JsonProperty("importance_score")
    private Double importanceScore;
    
    @JsonProperty("keywords_matched")
    private List<String> keywordsMatched;
    
    @JsonProperty("teacher_notes")
    private String teacherNotes;
    
    @JsonProperty("created_at")
    private String createdAt;
    
    // Getters and setters...
}

// Service class
@Service
public class ContextExtractionService {
    
    @Value("${speech-to-text.api.url:http://localhost:8000}")
    private String apiUrl;
    
    @Autowired
    private RestTemplate restTemplate;
    
    public ContextExtractionResponse extractContexts(
            String presentationId,
            List<Segment> segments,
            List<SlideTransition> slideTransitions) {
        
        ContextExtractionRequest request = new ContextExtractionRequest();
        request.setPresentationId(presentationId);
        request.setSegments(segments);
        request.setSlideTransitions(slideTransitions);
        request.setMinImportanceThreshold(30.0);
        
        String url = apiUrl + "/analytics/context-extraction";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<ContextExtractionRequest> entity = 
            new HttpEntity<>(request, headers);
        
        ResponseEntity<ContextExtractionResponse> response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            entity,
            ContextExtractionResponse.class
        );
        
        return response.getBody();
    }
}
```

---

## 4. Lưu Ý Quan Trọng

### Dữ Liệu Đầu Vào

1. **Segments phải có:**
   - `text`: Nội dung transcript (bắt buộc)
   - `start_time`, `end_time`: Timestamps chính xác (bắt buộc)
   - `confidence`: Độ tin cậy (0.0-1.0, bắt buộc)
   - `word_count`: Số từ (tự động tính nếu không có)

2. **Tùy chọn nhưng khuyến nghị:**
   - `slide_id`: Giúp nhóm contexts theo slide
   - `matched_keywords`: Tăng độ chính xác importance score

3. **Slide Transitions:**
   - Cung cấp `slide_transitions` để tăng độ chính xác
   - Segments gần slide transitions (trong 5 giây) được đánh giá cao hơn

### Điều Chỉnh Threshold

- `min_importance_threshold = 30.0`: Mặc định, lọc contexts có importance >= 30
- Giảm threshold (ví dụ: 20.0) → Nhiều contexts hơn, nhưng có thể có noise
- Tăng threshold (ví dụ: 50.0) → Ít contexts hơn, nhưng chỉ lấy những cái quan trọng nhất

### Performance

- Xử lý ~1000 segments trong < 1 giây
- Không cần GPU, chạy trên CPU
- Không có external API calls (hoàn toàn local)

---

## 5. Error Handling

### HTTP Status Codes

- `200 OK`: Thành công
- `400 Bad Request`: Request body không hợp lệ
- `500 Internal Server Error`: Lỗi xử lý

### Error Response

```json
{
  "detail": "Context extraction failed: <error message>"
}
```

---

## 6. Tích Hợp Với Transcript Data

Nếu bạn đã có transcript từ WebSocket streaming hoặc từ database:

```typescript
// Từ WebSocket streaming results
const segments = transcriptionResults
  .filter(r => r.is_final) // Chỉ lấy final results
  .map(r => ({
    text: r.text,
    start_time: r.timestamp - (r.duration || 0),
    end_time: r.timestamp,
    confidence: r.confidence,
    word_count: r.text.split(/\s+/).length,
    slide_id: r.slide?.slide_id,
    matched_keywords: r.slide?.matched_keywords || [],
  }));

// Từ database (Java)
List<Segment> segments = transcriptionRecords.stream()
    .map(record -> {
        Segment seg = new Segment();
        seg.setText(record.getText());
        seg.setStartTime(record.getStartTime());
        seg.setEndTime(record.getEndTime());
        seg.setConfidence(record.getConfidence());
        seg.setWordCount(record.getWordCount());
        seg.setSlideId(record.getSlideId());
        seg.setMatchedKeywords(record.getMatchedKeywords());
        return seg;
    })
    .collect(Collectors.toList());
```

---

## 7. Best Practices

1. **Chỉ gửi final segments:** Bỏ qua interim results để tránh noise
2. **Cung cấp slide transitions:** Tăng độ chính xác đáng kể
3. **Điều chỉnh threshold theo nhu cầu:** Test với các giá trị khác nhau
4. **Cache kết quả:** Contexts không thay đổi nếu segments không đổi
5. **Xử lý async:** API có thể mất 1-2 giây với nhiều segments

---

## 8. Ví Dụ Hoàn Chỉnh

### Frontend: Extract và hiển thị contexts

```typescript
// Sau khi recording kết thúc
async function analyzeRecording(presentationId: string) {
  // 1. Lấy transcript segments từ API hoặc state
  const segments = await fetchTranscriptSegments(presentationId);
  
  // 2. Lấy slide transitions (nếu có)
  const slideTransitions = await fetchSlideTransitions(presentationId);
  
  // 3. Extract contexts
  const result = await extractContexts(
    presentationId,
    segments,
    slideTransitions
  );
  
  // 4. Hiển thị contexts
  result.contexts.forEach(ctx => {
    console.log(`[${ctx.context_type}] ${ctx.text}`);
    console.log(`Importance: ${ctx.importance_score}/100`);
    console.log(`Time: ${ctx.start_time}s - ${ctx.end_time}s`);
  });
  
  return result;
}
```

### Backend Java: Lưu contexts vào database

```java
@Transactional
public void analyzeAndSaveContexts(Long lectureId, String presentationId) {
    // 1. Lấy transcript segments từ database
    List<TranscriptionRecord> records = transcriptionRepository
        .findByLectureId(lectureId);
    
    // 2. Convert sang segments
    List<Segment> segments = records.stream()
        .map(this::toSegment)
        .collect(Collectors.toList());
    
    // 3. Lấy slide transitions
    List<SlideTransition> transitions = getSlideTransitions(lectureId);
    
    // 4. Extract contexts
    ContextExtractionResponse response = contextExtractionService
        .extractContexts(presentationId, segments, transitions);
    
    // 5. Lưu vào database
    for (Context ctx : response.getContexts()) {
        ContextEntity entity = new ContextEntity();
        entity.setLectureId(lectureId);
        entity.setPresentationId(presentationId);
        entity.setContextId(ctx.getContextId());
        entity.setStartTime(ctx.getStartTime());
        entity.setEndTime(ctx.getEndTime());
        entity.setSlidePage(ctx.getSlidePage());
        entity.setText(ctx.getText());
        entity.setContextType(ctx.getContextType());
        entity.setImportanceScore(ctx.getImportanceScore());
        entity.setKeywordsMatched(ctx.getKeywordsMatched());
        contextRepository.save(entity);
    }
}
```

---

## Tóm Tắt

- **Endpoint:** `POST /analytics/context-extraction`
- **Input:** Segments (text, timestamps, confidence) + slide transitions (optional)
- **Output:** Contexts (type, importance, timestamps, keywords)
- **Use case:** Tự động tìm các khoảnh khắc giảng dạy quan trọng từ transcript
- **Performance:** Nhanh (< 1s cho 1000 segments), không cần GPU

