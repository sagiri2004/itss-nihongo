# 📋 Phân tích chi tiết: Các Module được sử dụng bởi từng Router FastAPI

## 🔍 Tổng quan

Tài liệu này liệt kê chi tiết tất cả các module trong `speech-to-text/src/` được sử dụng bởi 6 router FastAPI.

---

## 1. **`/slides`** - Router: `slides.py`

### ✅ Modules được sử dụng TRỰC TIẾP:

#### **slide_processing/**
- **Import**: `PDFProcessingError`, `SlideProcessor`
- **File**: `src/slide_processing/__init__.py` → `src/slide_processing/slide_processor.py`
- **Sử dụng**: 
  - `PDFProcessingError` - Exception handling
  - `SlideProcessor` - Xử lý slide (trong code cũ, hiện tại dùng `GeminiProcessor`)

#### **pdf_processing/**
- **Import**: 
  - `TextSummarizer` từ `pdf_processing.text_summarizer`
  - `GeminiProcessor` từ `pdf_processing.gemini_processor`
- **Files**: 
  - `src/pdf_processing/text_summarizer.py`
  - `src/pdf_processing/gemini_processor.py`
- **Sử dụng**:
  - `TextSummarizer` - Tạo global summary cho tất cả slides
  - `GeminiProcessor` - Xử lý PDF slides với Gemini API (chính)

### ⚠️ Modules được sử dụng GIÁN TIẾP (qua SlideProcessor):

Khi `SlideProcessor` được sử dụng (trong code cũ), nó import:
- `pdf_processing.pdf_extractor` → `PDFExtractor`, `SlideContent`
- `pdf_processing.japanese_nlp` → `JapaneseNLP`
- `pdf_processing.keyword_indexer` → `KeywordIndexer`
- `pdf_processing.embedding_generator` → `EmbeddingGenerator`
- `pdf_processing.text_summarizer` → `TextSummarizer`
- `matching.exact_matcher` → `ExactMatcher`
- `matching.fuzzy_matcher` → `FuzzyMatcher`
- `matching.semantic_matcher` → `SemanticMatcher`
- `matching.score_combiner` → `ScoreCombiner`, `MatchResult`

**Lưu ý**: Hiện tại router này chủ yếu dùng `GeminiProcessor`, không dùng `SlideProcessor` nữa.

### 📦 External Libraries:
- `google.cloud.storage` - Download PDF từ GCS
- `google.api_core.exceptions` - Exception handling cho GCS

---

## 2. **`/ws`** - Router: `transcription.py`

### ✅ Modules được sử dụng TRỰC TIẾP:

#### **streaming/**
- **Import**: `StreamingSessionManager` từ `streaming.session_manager`
- **File**: `src/streaming/session_manager.py`
- **Sử dụng**: Quản lý WebSocket session cho real-time speech-to-text streaming

### ⚠️ Modules được sử dụng GIÁN TIẾP (qua StreamingSessionManager):

`StreamingSessionManager` import:
- `streaming.audio_handler` → `AudioChunkHandler`
- `streaming.result_handler` → `StreamingResultHandler`, `StreamingResult`
- `streaming.errors` → `SessionTimeoutError`, `SessionNotFoundError`, `SessionRenewalError`, `StreamInterruptedError`, `AudioChunkError`

**Quan trọng**: `streaming.result_handler` import `SlideProcessor` từ `slide_processing`, có nghĩa là:
- `/ws` router gián tiếp sử dụng `slide_processing/` qua `StreamingSessionManager` → `result_handler` → `SlideProcessor`

Các module khác trong `streaming/` có thể được sử dụng gián tiếp:
- `streaming.audio_preprocessing` → Audio preprocessing functions (qua AudioChunkHandler)
- `streaming.session_renewer` → Session renewal (có thể được dùng)
- `streaming.metrics_collector` → Metrics collection (có thể được dùng)
- `streaming.alerting` → Alerting system (có thể được dùng)

### 📦 External Libraries:
- `requests` - HTTP requests đến backend
- `google.cloud.speech` - Google Cloud Speech-to-Text API (có thể được dùng gián tiếp)

---

## 3. **`/analytics`** - Router: `analytics.py`

### ✅ Modules được sử dụng TRỰC TIẾP:

#### **analytics/**
- **Import**: 
  - `ContextExtractor`, `ExportGenerator` từ `analytics.context_extraction`
  - `IntentionAnalyzer`, `IntentionStatistics` từ `analytics.intention_analysis`
- **Files**: 
  - `src/analytics/context_extraction.py`
  - `src/analytics/intention_analysis.py`
- **Sử dụng**:
  - `ContextExtractor` - Trích xuất các context quan trọng từ transcript
  - `ExportGenerator` - Export contexts dưới dạng JSON, text, HTML
  - `IntentionAnalyzer` - Phân tích ý định giảng dạy từ transcript
  - `IntentionStatistics` - Thống kê về intentions

### ⚠️ Modules được sử dụng GIÁN TIẾP:

Các module analytics có thể sử dụng:
- `analytics/intention_phrases.json` - File JSON chứa phrases cho intention analysis

### 📦 External Libraries:
- Không có external libraries đặc biệt (chỉ dùng standard library)

---

## 4. **`/proxy`** - Router: `speech_proxy.py`

### ✅ Modules được sử dụng TRỰC TIẾP:

**KHÔNG có module nào từ `src/` được sử dụng!**

Router này chỉ là proxy đơn giản, không import bất kỳ module nào từ `src/`.

### 📦 External Libraries:
- `google.cloud.speech` - Google Cloud Speech-to-Text API (trực tiếp)

---

## 5. **`/analysis`** - Router: `analysis.py`

### ✅ Modules được sử dụng TRỰC TIẾP:

**KHÔNG có module nào từ `src/` được sử dụng!**

Router này chỉ sử dụng Gemini API trực tiếp.

### 📦 External Libraries:
- `google.generativeai` - Gemini API (trực tiếp)

---

## 6. **`/final-analysis`** - Router: `final_analysis.py`

### ✅ Modules được sử dụng TRỰC TIẾP:

**KHÔNG có module nào từ `src/` được sử dụng!**

Router này chỉ sử dụng Gemini API trực tiếp.

### 📦 External Libraries:
- `google.generativeai` - Gemini API (trực tiếp)
- `PIL` (Pillow) - Xử lý images
- `fitz` (PyMuPDF) - Extract PDF pages as images

---

## 📊 Tóm tắt Module Usage

### ✅ Modules được sử dụng TRỰC TIẾP bởi routers:

| Module | Router sử dụng | Mức độ sử dụng |
|--------|----------------|----------------|
| `slide_processing/` | `/slides` | ⚠️ Ít (chủ yếu dùng GeminiProcessor) |
| `pdf_processing/text_summarizer.py` | `/slides` | ✅ Trung bình |
| `pdf_processing/gemini_processor.py` | `/slides` | ✅ Cao (chính) |
| `streaming/session_manager.py` | `/ws` | ✅ Cao |
| `analytics/context_extraction.py` | `/analytics` | ✅ Cao |
| `analytics/intention_analysis.py` | `/analytics` | ✅ Cao |

### ❌ Modules KHÔNG được sử dụng bởi routers:

| Module | Lý do |
|--------|-------|
| `database.py` | Không được import bởi router nào |
| `processing/` | Không được import bởi router nào |
| `google_cloud/` | Không được import trực tiếp (có thể dùng trong tests) |
| `audio/` | Chỉ có folder debug rỗng |
| `models.py` | Chỉ được dùng gián tiếp (không trực tiếp trong routers) |
| `matching/` | Chỉ được dùng gián tiếp qua SlideProcessor (không còn dùng) |

### ⚠️ Modules được sử dụng GIÁN TIẾP:

- `slide_processing/` - Qua `/ws` router → `StreamingSessionManager` → `result_handler` → `SlideProcessor`
- `matching/` - Qua `SlideProcessor` (trong `result_handler` và có thể trong `/slides` code cũ)
- `pdf_processing/` (các file khác) - Qua `SlideProcessor` (trong `result_handler`)
- `streaming/` (các file khác) - Qua `StreamingSessionManager`:
  - `streaming.audio_handler` → `AudioChunkHandler`
  - `streaming.result_handler` → `StreamingResultHandler`
  - `streaming.errors` → Custom exceptions

---

## 🎯 Kết luận

### Routers sử dụng nhiều modules nhất:
1. **`/slides`** - Sử dụng trực tiếp: `slide_processing/`, `pdf_processing/` (2 modules)
2. **`/analytics`** - Sử dụng trực tiếp: `analytics/` (2 modules)
3. **`/ws`** - Sử dụng trực tiếp: `streaming/` (1 module), gián tiếp: `slide_processing/`, `matching/`, `pdf_processing/` (qua `result_handler`)

### Routers không sử dụng module nào từ `src/`:
- **`/proxy`** - Chỉ dùng external libraries
- **`/analysis`** - Chỉ dùng external libraries
- **`/final-analysis`** - Chỉ dùng external libraries

### Modules quan trọng nhất:
1. **`pdf_processing/gemini_processor.py`** - Được dùng bởi `/slides` (router chính)
2. **`streaming/session_manager.py`** - Được dùng bởi `/ws` (router chính)
3. **`analytics/`** - Được dùng bởi `/analytics` (router chính)
4. **`slide_processing/`** - Được dùng bởi `/slides` (trực tiếp) và `/ws` (gián tiếp qua `result_handler`)
5. **`matching/`** - Được dùng gián tiếp qua `SlideProcessor` trong `result_handler` (cho `/ws`)

