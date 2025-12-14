# Hướng Dẫn Lấy Google Gemini API Key

## Bước 1: Truy cập Google AI Studio

1. Mở trình duyệt và vào: **https://aistudio.google.com/**
2. Đăng nhập bằng Google account của bạn

## Bước 2: Tạo API Key

1. Click vào **menu (☰)** ở góc trên bên trái
2. Chọn **"Get API key"** hoặc **"API keys"**
3. Click **"Create API key"**
4. Chọn project:
   - Nếu đã có project: chọn project hiện có
   - Nếu chưa có: click **"Create project"** để tạo mới
5. **Copy API key** được hiển thị (có dạng `AIza...`)

## Bước 3: Thiết lập trong project

### Cách 1: Environment Variables (Khuyến nghị)

Tạo file `.env` trong thư mục `speech-to-text/`:

```bash
GOOGLE_API_KEY=AIza...  # Paste API key của bạn
USE_LLM_SUMMARIZER=true
LLM_SUMMARIZER_PROVIDER=gemini
GEMINI_MODEL=gemini-pro
```

Hoặc export trực tiếp trong terminal:

```bash
export GOOGLE_API_KEY="AIza..."
export USE_LLM_SUMMARIZER="true"
export LLM_SUMMARIZER_PROVIDER="gemini"
export GEMINI_MODEL="gemini-2.0-flash"  # hoặc "gemini-1.5-flash", "gemini-1.5-flash"
```

### Cách 2: Kiểm tra API Key hoạt động

Test nhanh:

```python
import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-pro")
response = model.generate_content("Xin chào, bạn có thể tóm tắt không?")
print(response.text)
```

## Lưu ý quan trọng

1. **Bảo mật API Key:**
   - ❌ KHÔNG commit API key vào git
   - ✅ Thêm `.env` vào `.gitignore`
   - ✅ Chỉ share API key với người tin cậy

2. **Free Tier:**
   - Gemini Pro có thể có free tier với giới hạn requests
   - Kiểm tra quota tại: https://aistudio.google.com/app/apikey

3. **Rate Limits:**
   - Có thể có giới hạn số requests/phút
   - Nếu vượt quá, sẽ phải đợi hoặc upgrade plan

## Troubleshooting

### Lỗi "API key not found"
- Kiểm tra đã export environment variable chưa: `echo $GOOGLE_API_KEY`
- Kiểm tra API key có đúng format không (bắt đầu bằng "AIza")

### Lỗi "Quota exceeded"
- Đã vượt quá free tier limit
- Đợi một lúc hoặc upgrade plan

### Lỗi "Invalid API key"
- API key có thể đã bị revoke
- Tạo API key mới tại Google AI Studio

## Liên kết hữu ích

- Google AI Studio: https://aistudio.google.com/
- Gemini API Documentation: https://ai.google.dev/docs
- Pricing: https://ai.google.dev/pricing

