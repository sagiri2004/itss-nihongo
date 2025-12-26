# 🔍 Phân tích: Có thể xóa các Module Local Models không?

## 📋 Tổng quan

Tài liệu này phân tích các module sử dụng local models (không phải API) và đánh giá khả năng xóa chúng.

---

## 🧠 Các Module sử dụng Local Models

### 1. **`pdf_processing/embedding_generator.py`**
- **Local Model**: `sentence-transformers` (SentenceTransformer)
- **Dependencies**: 
  - `torch` (PyTorch)
  - `sentence-transformers`
  - `faiss` (optional, cho fast similarity search)
- **Model**: `paraphrase-multilingual-mpnet-base-v2` hoặc `sonoisa/sentence-bert-base-ja-mean-tokens`
- **Chức năng**: Tạo embeddings cho semantic similarity matching

### 2. **`pdf_processing/japanese_nlp.py`**
- **Local Model**: `MeCab` tokenizer
- **Dependencies**: `MeCab`
- **Chức năng**: Japanese text tokenization, normalization

### 3. **`pdf_processing/text_summarizer.py`**
- **Local Model**: `ginza` / `ja-ginza` (spaCy models)
- **Dependencies**: `ginza`, `ja-ginza`, `spacy`
- **Chức năng**: Text summarization với NLP (có option dùng LLM API)
- **Lưu ý**: Có `use_llm=True` option để dùng Gemini API thay vì local NLP

### 4. **`matching/semantic_matcher.py`**
- **Dependencies**: Sử dụng `EmbeddingGenerator` (gián tiếp dùng sentence-transformers)
- **Chức năng**: Semantic matching dựa trên embeddings

### 5. **`matching/exact_matcher.py`** và **`matching/fuzzy_matcher.py`**
- **Local Processing**: Không dùng ML models, chỉ text matching
- **Có thể xóa**: ❌ Không, vì không phải local models, chỉ là text processing

---

## 🔗 Dependency Chain

```
SlideProcessor
  ├── EmbeddingGenerator (sentence-transformers) ← LOCAL MODEL
  ├── JapaneseNLP (MeCab) ← LOCAL MODEL
  ├── KeywordIndexer (text processing only)
  ├── TextSummarizer (ginza/spaCy) ← LOCAL MODEL (có option use_llm)
  ├── ExactMatcher (text matching only)
  ├── FuzzyMatcher (text matching only)
  └── SemanticMatcher (dùng EmbeddingGenerator) ← LOCAL MODEL
```

---

## 📊 Sử dụng trong Routers

### 1. **`/slides` Router (slides.py)**

#### Hiện tại:
- ✅ **Chỉ dùng `GeminiProcessor()`** - API-based, không dùng local models
- ✅ `TextSummarizer` được dùng trong `_generate_all_summary()` nhưng với **`use_llm=True`** (dùng Gemini API)
- ❌ `SlideProcessor` **KHÔNG được sử dụng** trong code hiện tại
- ⚠️ `use_embeddings` parameter có nhưng **không được dùng** (comment: "Not used with Gemini")

#### Code hiện tại:
```python
# Chỉ dùng GeminiProcessor (API)
processor = GeminiProcessor()
result = processor.process_pdf(str(temp_path))

# TextSummarizer với use_llm=True (API)
summarizer = TextSummarizer(use_llm=use_llm)  # use_llm=True mặc định
```

### 2. **`/ws` Router (transcription.py)**

#### Qua `result_handler`:
- ⚠️ `result_handler.preload_slides()` có thể dùng `SlideProcessor`
- ⚠️ Nhưng **`use_embeddings=False` mặc định**
- ⚠️ Chỉ dùng nếu `enable_slide_matching=True`

#### Code:
```python
# result_handler.py
def preload_slides(
    self,
    pdf_path: str,
    storage_service = None,
    use_embeddings: bool = False  # ← MẶC ĐỊNH FALSE
) -> Dict:
    if use_embeddings:
        # Chỉ load embeddings nếu explicitly set True
        self.slide_processor = SlideProcessor(..., use_embeddings=True)
```

---

## ✅ Kết luận: Có thể xóa không?

### 🟢 **CÓ THỂ XÓA** các module sau:

#### 1. **`pdf_processing/embedding_generator.py`** ✅
- **Lý do**: 
  - Không được dùng trong `/slides` router (dùng GeminiProcessor)
  - Không được dùng trong `/ws` router (use_embeddings=False mặc định)
  - Chỉ được dùng khi `SlideProcessor` với `use_embeddings=True`
  - ⚠️ Có trong `google_cloud/speech_to_text.py` nhưng module này không được dùng trong routers
- **Rủi ro**: Thấp - không được sử dụng trong production code hiện tại (routers)

#### 2. **`matching/semantic_matcher.py`** ✅
- **Lý do**: 
  - Phụ thuộc vào `EmbeddingGenerator`
  - Chỉ được dùng khi `SlideProcessor` với `use_embeddings=True`
- **Rủi ro**: Thấp - không được sử dụng trong production code hiện tại

#### 3. **`pdf_processing/japanese_nlp.py`** ⚠️
- **Lý do**: 
  - Được dùng bởi `SlideProcessor` (nhưng SlideProcessor không được dùng)
  - Có thể được dùng bởi các module khác
- **Rủi ro**: Trung bình - cần kiểm tra xem có module nào khác dùng không

### 🟡 **CẦN CẨN THẬN**:

#### 4. **`pdf_processing/text_summarizer.py`** ⚠️
- **Lý do**: 
  - ✅ Được dùng trong `/slides` router
  - ✅ Nhưng với `use_llm=True` (dùng Gemini API)
  - ⚠️ Có fallback về local NLP nếu `use_llm=False`
- **Rủi ro**: Trung bình - có thể cần fallback
- **Khuyến nghị**: Giữ lại nhưng có thể tối ưu để chỉ dùng LLM mode

### 🔴 **KHÔNG NÊN XÓA**:

#### 5. **`matching/exact_matcher.py`** và **`matching/fuzzy_matcher.py`** ❌
- **Lý do**: 
  - Không phải local models, chỉ là text processing
  - Có thể được dùng trong `SlideProcessor` (nếu được enable)
- **Rủi ro**: Thấp nếu xóa, nhưng không cần thiết vì không phải local models

---

## 🎯 Khuyến nghị

### ✅ **AN TOÀN ĐỂ XÓA**:

1. **`pdf_processing/embedding_generator.py`**
   - Không được sử dụng trong production
   - Tiết kiệm: `torch`, `sentence-transformers`, `faiss` dependencies

2. **`matching/semantic_matcher.py`**
   - Phụ thuộc vào `EmbeddingGenerator`
   - Không được sử dụng trong production

### ⚠️ **CẦN KIỂM TRA TRƯỚC KHI XÓA**:

3. **`pdf_processing/japanese_nlp.py`**
   - Kiểm tra xem có module nào khác dùng `JapaneseNLP` không
   - Nếu không, có thể xóa

### 🔄 **TỐI ƯU THAY VÌ XÓA**:

4. **`pdf_processing/text_summarizer.py`**
   - Giữ lại nhưng tối ưu để chỉ support LLM mode
   - Xóa code liên quan đến ginza/spaCy nếu không cần fallback

---

## 📦 Dependencies có thể xóa nếu xóa các module trên:

### Nếu xóa `embedding_generator.py` và `semantic_matcher.py`:
- `torch` (PyTorch) - ~2GB
- `sentence-transformers` - ~500MB
- `faiss` hoặc `faiss-cpu` - ~100MB
- **Tổng tiết kiệm**: ~2.6GB

### Nếu xóa `japanese_nlp.py`:
- `mecab-python3` - ~10MB
- **Tổng tiết kiệm**: ~10MB

### Nếu tối ưu `text_summarizer.py` (chỉ LLM mode):
- `ginza` - ~200MB
- `ja-ginza` - ~500MB
- `spacy` - ~100MB
- **Tổng tiết kiệm**: ~800MB

### **Tổng tiết kiệm tiềm năng**: ~3.4GB

---

## 🧪 Cách kiểm tra trước khi xóa:

1. **Kiểm tra imports:**
   ```bash
   grep -r "from.*embedding_generator\|import.*EmbeddingGenerator" src/
   grep -r "from.*japanese_nlp\|import.*JapaneseNLP" src/
   grep -r "from.*semantic_matcher\|import.*SemanticMatcher" src/
   ```

2. **Kiểm tra tests:**
   ```bash
   grep -r "EmbeddingGenerator\|JapaneseNLP\|SemanticMatcher" tests/
   ```

3. **Kiểm tra usage trong code:**
   ```bash
   grep -r "use_embeddings.*True\|use_embeddings=True" src/
   ```

---

## ✅ Kết luận cuối cùng

### **CÓ THỂ XÓA AN TOÀN:**
- ✅ `pdf_processing/embedding_generator.py`
- ✅ `matching/semantic_matcher.py`

### **CẦN KIỂM TRA:**
- ⚠️ `pdf_processing/japanese_nlp.py`

### **TỐI ƯU THAY VÌ XÓA:**
- 🔄 `pdf_processing/text_summarizer.py` - Giữ lại nhưng chỉ support LLM mode

### **KHÔNG XÓA:**
- ❌ `matching/exact_matcher.py`
- ❌ `matching/fuzzy_matcher.py`

