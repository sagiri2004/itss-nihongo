# API Response Format Documentation

Tài liệu này mô tả định dạng JSON data trả về từ các API endpoints của slide processing service.

**⚠️ LƯU Ý:** Từ phiên bản mới, hệ thống sử dụng **Gemini API** để xử lý toàn bộ PDF thay vì xử lý local. Response format đã được đơn giản hóa.

## 📋 Tổng quan

Có 2 endpoints chính trả về JSON:

1. **`POST /slides/upload`** - Upload và xử lý PDF trực tiếp bằng Gemini API
2. **`POST /slides/process`** - Xử lý PDF từ Google Cloud Storage (GCS) bằng Gemini API

**Tất cả xử lý đều được thực hiện bởi Gemini API:**
- ✅ Keywords extraction
- ✅ Slide summary generation
- ✅ Global summary generation

---

## 1. Endpoint: `POST /slides/upload`

### Request
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: PDF file (required)
  - `presentation_id`: Optional string
  - `use_embeddings`: Boolean (default: `true`)
  - `use_llm_summary`: Boolean (default: `true`)

### Response Format (Simplified - Gemini Only)

```json
{
  "filename": "presentation.pdf",
  "presentation_id": "optional-presentation-id",
  "slide_count": 10,
  "keywords_count": 150,
  "all_summary": "全スライドの要約（Gemini生成）",
  "slides": [
    {
      "slide_id": 1,
      "keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "summary": "このスライドの要約（Gemini生成）"
    },
    // ... more slides
  ]
}
```

### Field Descriptions (Simplified)

| Field | Type | Description |
|-------|------|-------------|
| `filename` | string | Tên file PDF đã upload |
| `presentation_id` | string \| null | ID của presentation (nếu có) |
| `slide_count` | integer | Tổng số slide đã xử lý |
| `keywords_count` | integer | Tổng số keywords unique (từ tất cả slides) |
| `all_summary` | string | Tóm tắt toàn bộ slide deck (Gemini生成) |
| `slides` | array | Danh sách các slide đã xử lý |
| `slides[].slide_id` | integer | Số thứ tự của slide (1-based) |
| `slides[].keywords` | array[string] | Keywords quan trọng của slide (Gemini抽出, 5-10個) |
| `slides[].summary` | string | Tóm tắt của slide (Gemini生成, 1-3文) |

**⚠️ Removed Fields (không còn trong response):**
- `title`, `headings`, `bullets`, `body`, `all_text` - Đã được loại bỏ để đơn giản hóa
- `has_embeddings` - Không còn sử dụng local embeddings
- `statistics` object - Đã được flatten thành các field riêng

---

## 2. Endpoint: `POST /slides/process`

### Request
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "lecture_id": 1,
  "gcs_uri": "gs://bucket-name/path/to/file.pdf",
  "original_name": "presentation.pdf",
  "use_embeddings": true,
  "use_llm_summary": true
}
```

### Response Format (Simplified - Gemini Only)

```json
{
  "lecture_id": 1,
  "original_name": "presentation.pdf",
  "slide_count": 10,
  "keywords_count": 150,
  "all_summary": "全スライドの要約（Gemini生成）",
  "slides": [
    {
      "slide_id": 1,
      "keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "summary": "このスライドの要約（Gemini生成）"
    },
    // ... more slides
  ]
}
```

### Field Descriptions (Simplified)

| Field | Type | Description |
|-------|------|-------------|
| `lecture_id` | integer | ID của lecture (từ request) |
| `original_name` | string \| null | Tên file gốc |
| `slide_count` | integer | Tổng số slide đã xử lý |
| `keywords_count` | integer | Tổng số keywords unique (từ tất cả slides) |
| `all_summary` | string | Tóm tắt toàn bộ slide deck (Gemini生成) |
| `slides` | array | Danh sách các slide đã xử lý (cùng format như `/upload`) |
| `slides[].slide_id` | integer | Số thứ tự của slide (1-based) |
| `slides[].keywords` | array[string] | Keywords quan trọng (Gemini抽出, 5-10個) |
| `slides[].summary` | string | Tóm tắt của slide (Gemini生成, 1-3文) |

---

## 📝 Chi tiết về các Field (Gemini Processing)

### `slides[].keywords`
- **Nguồn**: Được extract bởi Gemini API từ nội dung slide
- **Xử lý**: 
  - Gemini tự động identify keywords quan trọng
  - Filter stop words và common words
  - Chỉ giữ lại 5-10 keywords quan trọng nhất
  - Loại bỏ duplicates
- **Format**: Array of strings, mỗi string là một keyword (5-10 keywords per slide)

### `slides[].summary`
- **Nguồn**: Tóm tắt của từng slide được tạo bởi Gemini API
- **Xử lý**:
  - Gemini analyze toàn bộ nội dung slide
  - Tạo summary ngắn gọn, tập trung vào điểm chính
  - Tự động loại bỏ markdown formatting
- **Format**: String, ngắn gọn (1-3 câu), không có markdown formatting

### `all_summary`
- **Nguồn**: Tóm tắt toàn bộ slide deck được tạo bởi Gemini API
- **Xử lý**:
  - Gemini nhận tất cả slide summaries
  - Tạo global summary về chủ đề và nội dung chính của toàn bộ presentation
  - Tự động loại bỏ markdown formatting
- **Format**: String, ngắn gọn (dưới 5 câu), về chủ đề và nội dung chính

**⚠️ Removed Fields:**
- `headings`, `bullets`, `body`, `all_text` - Không còn được extract (chỉ dùng Gemini)
- `title` - Không còn được extract riêng

---

## 🔄 So sánh 2 Endpoints

| Feature | `/upload` | `/process` |
|---------|-----------|------------|
| Input | File upload | GCS URI |
| Processing | Gemini API | Gemini API |
| Response structure | Dict (simplified) | Pydantic model (structured) |
| `lecture_id` | Không có | Có (từ request) |
| `filename` | Có | Không (dùng `original_name`) |
| `presentation_id` | Có | Không |
| Fields | `slide_id`, `keywords`, `summary` | `slide_id`, `keywords`, `summary` |

---

## 📌 Lưu ý

1. **Encoding**: Tất cả text fields đều là UTF-8, hỗ trợ tiếng Nhật đầy đủ
2. **Empty values**: 
   - Arrays (`keywords`) có thể là empty array `[]`
   - Strings (`summary`, `all_summary`) có thể là empty string `""`
3. **Gemini Processing**: 
   - Tất cả xử lý đều được thực hiện bởi Gemini API
   - Nếu quota exceeded hoặc không có API key, sẽ trả về error
   - Gemini summary được clean để loại bỏ markdown formatting
4. **Keywords**: Được extract bởi Gemini, tự động filter và chỉ giữ lại 5-10 keywords quan trọng nhất
5. **Model**: Mặc định sử dụng `gemini-1.5-flash` (có thể config qua `GEMINI_MODEL` env var)

---

## 🧪 Example Response

### Example 1: `/upload` endpoint (Simplified)

```json
{
  "filename": "11_Webアプリ - スプリント2バックログ作成報告.pdf",
  "presentation_id": null,
  "slide_count": 2,
  "keywords_count": 15,
  "all_summary": "このプレゼンテーションは授業の開始時にチームリーダーが出席者を報告する方法について説明しています。",
  "slides": [
    {
      "slide_id": 1,
      "keywords": ["クラス名", "チーム名", "授業", "チームリーダ", "Slack", "出席者", "報告"],
      "summary": "授業のはじめにチームリーダはチームの出席者をSlackで報告する方法について説明しています。"
    },
    {
      "slide_id": 2,
      "keywords": ["バックログ", "スプリント", "作成", "報告"],
      "summary": "スプリント2のバックログ作成について報告します。"
    }
  ]
}
```

### Example 2: `/process` endpoint (Simplified)

```json
{
  "lecture_id": 1,
  "original_name": "11_Webアプリ - スプリント2バックログ作成報告.pdf",
  "slide_count": 2,
  "keywords_count": 15,
  "all_summary": "このプレゼンテーションは授業の開始時にチームリーダーが出席者を報告する方法と、スプリント2のバックログ作成について説明しています。",
  "slides": [
    {
      "slide_id": 1,
      "keywords": ["クラス名", "チーム名", "授業", "チームリーダ", "Slack"],
      "summary": "授業のはじめにチームリーダはチームの出席者をSlackで報告する方法について説明しています。"
    },
    {
      "slide_id": 2,
      "keywords": ["バックログ", "スプリント", "作成", "報告"],
      "summary": "スプリント2のバックログ作成について報告します。"
    }
  ]
}
```

