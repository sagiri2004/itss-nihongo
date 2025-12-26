# 📋 Phân tích Requirements.txt - Các Module có thể xóa

## ✅ Modules ĐANG ĐƯỢC SỬ DỤNG (GIỮ LẠI)

### Core API & Google Cloud
- ✅ `python-dotenv` - Load environment variables
- ✅ `google-cloud-speech` - Speech-to-Text API
- ✅ `google-cloud-storage` - GCS storage
- ✅ `google-generativeai` - Gemini API (chính)

### PDF Processing
- ✅ `PyMuPDF` (fitz) - PDF extraction
- ✅ `pytesseract` - OCR fallback trong pdf_extractor.py

### Image Processing
- ✅ `Pillow` - Image processing (dùng trong final_analysis.py)

### Text Matching
- ✅ `python-Levenshtein` - Fuzzy matching
- ✅ `rapidfuzz` - Fuzzy matching

### API Framework
- ✅ `fastapi` - API framework
- ✅ `uvicorn` - ASGI server
- ✅ `python-multipart` - File uploads

### Data Processing
- ✅ `numpy` - Numerical operations

---

## ❌ Modules KHÔNG ĐƯỢC SỬ DỤNG (CÓ THỂ XÓA)

### 1. **`assemblyai>=0.32.0`** ❌
- **Lý do**: Không được import hoặc sử dụng trong code
- **Khuyến nghị**: XÓA

### 2. **`boto3`** ❌
- **Lý do**: Không được import hoặc sử dụng (dùng Google Cloud thay vì AWS)
- **Khuyến nghị**: XÓA

### 3. **`google-cloud-translate>=3.11.0`** ❌
- **Lý do**: Không được import hoặc sử dụng
- **Khuyến nghị**: XÓA

### 4. **`pdfplumber==0.10.0`** ❌
- **Lý do**: Không được import hoặc sử dụng (chỉ dùng PyMuPDF)
- **Khuyến nghị**: XÓA

### 5. **`soundfile>=0.12.1`** ⚠️
- **Lý do**: Chỉ được dùng trong `processing/audio_converter.py`
- **Sử dụng**: Module `processing/` không được dùng trong routers
- **Khuyến nghị**: XÓA (nếu không cần audio_converter)

### 6. **`librosa>=0.10.0`** ⚠️
- **Lý do**: Chỉ được dùng trong `processing/audio_converter.py`
- **Sử dụng**: Module `processing/` không được dùng trong routers
- **Khuyến nghị**: XÓA (nếu không cần audio_converter)

### 7. **`scipy>=1.11.0`** ❌
- **Lý do**: Không được import hoặc sử dụng trực tiếp
- **Lưu ý**: Có thể là dependency của librosa, nhưng nếu xóa librosa thì cũng không cần
- **Khuyến nghị**: XÓA

### 8. **`click>=8.1.0`** ❌
- **Lý do**: Không được import hoặc sử dụng (CLI tool)
- **Khuyến nghị**: XÓA

### 9. **`tqdm>=4.65.0`** ❌
- **Lý do**: Không được import hoặc sử dụng (progress bar)
- **Khuyến nghị**: XÓA

### 10. **`sqlalchemy>=2.0.0`** ❌
- **Lý do**: 
  - `database.py` không được dùng trong routers
  - Database hiện tại là JSON-based, không dùng SQLAlchemy
- **Khuyến nghị**: XÓA

### 11. **`streamlit>=1.28.0`** ❌
- **Lý do**: Không được import hoặc sử dụng trong FastAPI app
- **Lưu ý**: Có thể là cho UI riêng, nhưng không dùng trong production
- **Khuyến nghị**: XÓA

### 12. **`streamlit-webrtc>=0.47.0`** ❌
- **Lý do**: Phụ thuộc của streamlit, không được dùng
- **Khuyến nghị**: XÓA

### 13. **`av>=10.0.0`** ❌
- **Lý do**: Phụ thuộc của streamlit-webrtc, không được dùng
- **Khuyến nghị**: XÓA

### 14. **`pydub>=0.25.1`** ❌
- **Lý do**: Không được import hoặc sử dụng
- **Khuyến nghị**: XÓA

### 15. **`pandas>=2.0.0.0`** ❌
- **Lý do**: Không được import hoặc sử dụng
- **Khuyến nghị**: XÓA

---

## 📊 Tóm tắt

### ✅ GIỮ LẠI (15 modules):
- python-dotenv
- google-cloud-speech
- google-cloud-storage
- google-generativeai
- PyMuPDF
- pytesseract
- Pillow
- python-Levenshtein
- rapidfuzz
- fastapi
- uvicorn
- python-multipart
- numpy

### ❌ XÓA (15 modules):
- assemblyai
- boto3
- google-cloud-translate
- pdfplumber
- soundfile (nếu không cần audio_converter)
- librosa (nếu không cần audio_converter)
- scipy
- click
- tqdm
- sqlalchemy
- streamlit
- streamlit-webrtc
- av
- pydub
- pandas

### 📦 Tiết kiệm ước tính:
- Giảm ~500MB-1GB dependencies
- Giảm thời gian build Docker
- Giảm kích thước Docker image

---

## 🎯 Khuyến nghị

1. **XÓA NGAY**: assemblyai, boto3, google-cloud-translate, pdfplumber, click, tqdm, sqlalchemy, streamlit, streamlit-webrtc, av, pydub, pandas, scipy

2. **XÓA NẾU KHÔNG CẦN audio_converter**: soundfile, librosa

3. **GIỮ LẠI**: Tất cả modules còn lại đều được sử dụng trong production code

