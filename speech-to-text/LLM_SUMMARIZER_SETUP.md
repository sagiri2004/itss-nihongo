# LLM Summarizer Setup Guide

Hướng dẫn thiết lập LLM APIs để tạo summary chất lượng cao hơn.

## Tổng quan

Hệ thống hỗ trợ 3 loại LLM APIs:
1. **OpenAI GPT** (GPT-4, GPT-3.5-turbo) - Chất lượng tốt nhất
2. **Anthropic Claude** (Claude 3 Haiku/Sonnet) - Cân bằng chất lượng và chi phí
3. **Google Gemini** (Gemini Pro) - Có thể có free tier

Nếu không có LLM API, hệ thống sẽ tự động fallback về extractive summarization (method hiện tại).

## Cài đặt

### 1. OpenAI

```bash
pip install openai
```

Thiết lập environment variable:
```bash
export OPENAI_API_KEY="your-api-key-here"
export USE_LLM_SUMMARIZER="true"
export OPENAI_MODEL="gpt-3.5-turbo"  # hoặc "gpt-4" cho chất lượng tốt hơn
```

### 2. Anthropic Claude

```bash
pip install anthropic
```

Thiết lập environment variable:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
export USE_LLM_SUMMARIZER="true"
export LLM_SUMMARIZER_PROVIDER="claude"
export CLAUDE_MODEL="claude-3-haiku-20240307"  # hoặc "claude-3-sonnet-20240229"
```

### 3. Google Gemini

#### Cách lấy API Key:

1. **Truy cập Google AI Studio:**
   - Vào: https://aistudio.google.com/
   - Đăng nhập bằng Google account của bạn

2. **Tạo API Key:**
   - Click vào menu (☰) ở góc trên bên trái
   - Chọn "Get API key" hoặc "API keys"
   - Click "Create API key"
   - Chọn project (hoặc tạo project mới)
   - Copy API key được tạo

3. **Lưu ý:**
   - API key có dạng: `AIza...` (bắt đầu bằng "AIza")
   - Giữ bí mật API key này, không commit vào git
   - Có thể có free tier với giới hạn requests

#### Cài đặt:

```bash
pip install google-generativeai
```

Thiết lập environment variable:
```bash
export GOOGLE_API_KEY="AIza..."  # Paste API key của bạn ở đây
export USE_LLM_SUMMARIZER="true"
export LLM_SUMMARIZER_PROVIDER="gemini"
export GEMINI_MODEL="gemini-2.0-flash"  # hoặc "gemini-1.5-flash", "gemini-1.5-flash"
```

Hoặc tạo file `.env`:
```bash
GOOGLE_API_KEY=AIza...
USE_LLM_SUMMARIZER=true
LLM_SUMMARIZER_PROVIDER=gemini
GEMINI_MODEL=gemini-pro
```

## So sánh các options

| Provider | Chất lượng | Chi phí | Tốc độ | Khuyến nghị |
|----------|-----------|---------|--------|------------|
| GPT-4 | ⭐⭐⭐⭐⭐ | $$$$ | Chậm | Best quality |
| GPT-3.5-turbo | ⭐⭐⭐⭐ | $$ | Nhanh | Cân bằng tốt |
| Claude Sonnet | ⭐⭐⭐⭐⭐ | $$$ | Trung bình | Chất lượng cao |
| Claude Haiku | ⭐⭐⭐⭐ | $ | Rất nhanh | Cost-effective |
| Gemini Pro | ⭐⭐⭐⭐ | $ (có thể free) | Nhanh | Budget option |
| Extractive (fallback) | ⭐⭐⭐ | Free | Rất nhanh | Không cần API |

## Cách hoạt động

1. Hệ thống tự động detect API key có sẵn
2. Nếu có LLM API → sử dụng LLM để tạo summary chất lượng cao
3. Nếu không có → fallback về extractive method (method hiện tại)

## Ví dụ sử dụng

### Trong code:

```python
from src.pdf_processing.text_summarizer import TextSummarizer

# Tự động detect LLM nếu có API key
summarizer = TextSummarizer()

# Hoặc force sử dụng LLM
summarizer = TextSummarizer(use_llm=True)

# Hoặc force không dùng LLM
summarizer = TextSummarizer(use_llm=False)
```

### Environment variables:

```bash
# .env file
USE_LLM_SUMMARIZER=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
```

## Chi phí ước tính

- **GPT-3.5-turbo**: ~$0.001-0.002 per summary (1000 tokens input)
- **GPT-4**: ~$0.01-0.03 per summary
- **Claude Haiku**: ~$0.0005-0.001 per summary
- **Claude Sonnet**: ~$0.003-0.01 per summary
- **Gemini Pro**: ~$0.0005-0.001 per summary (có thể free tier)

## Khuyến nghị

1. **Development/Testing**: Sử dụng Gemini Pro (free tier) hoặc Claude Haiku (rẻ)
2. **Production (chất lượng cao)**: GPT-4 hoặc Claude Sonnet
3. **Production (cân bằng)**: GPT-3.5-turbo hoặc Claude Haiku
4. **Không có budget**: Sử dụng extractive method (fallback)

## Troubleshooting

### LLM không hoạt động?

1. Kiểm tra API key đã được set chưa:
   ```bash
   echo $OPENAI_API_KEY  # hoặc $ANTHROPIC_API_KEY, $GOOGLE_API_KEY
   ```

2. Kiểm tra package đã được cài đặt:
   ```bash
   pip list | grep openai  # hoặc anthropic, google-generativeai
   ```

3. Kiểm tra logs:
   ```bash
   # Tìm log messages về LLM initialization
   grep -i "llm\|summarizer" logs/app.log
   ```

### Fallback về extractive method?

- Đây là behavior bình thường nếu không có LLM API
- Extractive method vẫn hoạt động tốt, chỉ là không "thông minh" bằng LLM

