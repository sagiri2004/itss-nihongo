# Final Analysis API Documentation

## Endpoint
`POST /final-analysis/final-analysis`

## Request Body Structure

Endpoint này nhận vào một JSON object với cấu trúc sau:

```json
{
  "lecture_id": 123,                    // int (required) - ID của buổi học
  "global_summary": "Tóm tắt tổng quan...",  // string (optional) - Tóm tắt tổng quan của toàn bộ slide deck
  "slide_transcripts": [                 // array (required, default: []) - Danh sách transcripts từ các slide
    {
      "slide_page_number": 1,            // int (required) - Số trang của slide
      "transcript_text": "Nội dung ghi âm...",  // string (required) - Tất cả messages đã được join lại thành một text
      "slide_summary": "Tóm tắt slide..."  // string (optional) - Summary của slide đó (nếu có)
    },
    {
      "slide_page_number": 2,
      "transcript_text": "Nội dung ghi âm slide 2...",
      "slide_summary": "Tóm tắt slide 2..."
    }
    // ... các slide khác
  ]
}
```

## Chi tiết các trường

### Root Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lecture_id` | `int` | ✅ Yes | ID của buổi học cần phân tích |
| `global_summary` | `string` | ❌ No | Tóm tắt tổng quan của toàn bộ slide deck. Nếu không có, có thể là `null` hoặc không gửi field này |
| `slide_transcripts` | `array` | ✅ Yes | Danh sách các transcript từ từng slide. Phải có ít nhất 1 slide transcript |

### SlideTranscript Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slide_page_number` | `int` | ✅ Yes | Số trang của slide (bắt đầu từ 1) |
| `transcript_text` | `string` | ✅ Yes | Toàn bộ text đã được join từ các messages ghi âm của slide đó. Các messages được sắp xếp theo `relative_time_sec` và join bằng dấu cách |
| `slide_summary` | `string` | ❌ No | Tóm tắt nội dung của slide đó. Nếu không có, có thể là `null` hoặc không gửi field này |

## Ví dụ Request

```json
{
  "lecture_id": 9,
  "global_summary": "Bài giảng về Machine Learning cơ bản, bao gồm các khái niệm về supervised learning, unsupervised learning, và neural networks.",
  "slide_transcripts": [
    {
      "slide_page_number": 1,
      "transcript_text": "Chào các bạn, hôm nay chúng ta sẽ học về Machine Learning. Machine Learning là một nhánh của trí tuệ nhân tạo...",
      "slide_summary": "Slide giới thiệu về Machine Learning"
    },
    {
      "slide_page_number": 2,
      "transcript_text": "Supervised learning là phương pháp học có giám sát. Chúng ta có dữ liệu đầu vào và kết quả mong muốn...",
      "slide_summary": "Slide về Supervised Learning"
    },
    {
      "slide_page_number": 3,
      "transcript_text": "Unsupervised learning khác với supervised learning ở chỗ chúng ta không có nhãn cho dữ liệu...",
      "slide_summary": null
    }
  ]
}
```

## Response Structure

Endpoint trả về một `FinalAnalysisResponse` với cấu trúc:

```json
{
  "id": 1,                              // int (optional) - ID của analysis trong database
  "lecture_id": 9,                      // int (required)
  "overall_score": 0.85,                // float (0.0-1.0) - Điểm tổng thể
  "overall_feedback": "講義全体として...",  // string - Nhận xét tổng thể (tiếng Nhật)
  "content_coverage": 0.90,             // float (0.0-1.0) - Độ bao phủ nội dung
  "structure_quality": 0.80,            // float (0.0-1.0) - Chất lượng cấu trúc
  "clarity_score": 0.85,                // float (0.0-1.0) - Độ rõ ràng
  "engagement_score": 0.75,             // float (0.0-1.0) - Độ thu hút
  "time_management": 0.80,               // float (0.0-1.0) - Quản lý thời gian
  "slide_analyses": [                    // array - Phân tích từng slide
    {
      "slide_page_number": 1,
      "score": 0.85,
      "feedback": "このスライドは...",
      "strengths": ["強み1", "強み2"],
      "improvements": ["改善点1", "改善点2"]
    }
  ],
  "strengths": ["総合的な強み1", "総合的な強み2"],      // array - Điểm mạnh tổng thể
  "improvements": ["総合的な改善点1", "総合的な改善点2"],  // array - Điểm cần cải thiện
  "recommendations": ["推奨事項1", "推奨事項2"]         // array - Gợi ý cụ thể
}
```

## Validation Rules

1. **lecture_id**: Bắt buộc, phải là số nguyên dương
2. **slide_transcripts**: Phải có ít nhất 1 slide transcript
3. **slide_page_number**: Phải là số nguyên dương
4. **transcript_text**: Không được rỗng (ít nhất phải có 1 ký tự)

## Error Responses

### 400 Bad Request
```json
{
  "detail": "At least one slide transcript is required"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Google API key not configured"
}
```

hoặc

```json
{
  "detail": "Failed to parse analysis response: ..."
}
```

## Notes

- Tất cả các text field trong response (feedback, strengths, improvements, recommendations) đều được trả về bằng **tiếng Nhật**
- Các scores đều nằm trong khoảng 0.0 đến 1.0
- `global_summary` và `slide_summary` có thể là `null` hoặc không được gửi
- `transcript_text` là kết quả của việc join tất cả messages từ recording, được sắp xếp theo thời gian

