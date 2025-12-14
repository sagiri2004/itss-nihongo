# Giải thích Prompt Final Analysis

## Tổng quan
Prompt Final Analysis được sử dụng để đánh giá toàn diện một buổi giảng dựa trên:
1. **Global Summary**: Tóm tắt tổng quan của toàn bộ slide deck
2. **Slide Transcripts**: Tất cả các bản ghi âm (transcript) từ từng slide đã được ghi lại

## Mục đích
Prompt này yêu cầu Google Gemini AI đóng vai trò là một chuyên gia đánh giá và phân tích bài thuyết trình giáo dục, thực hiện phân tích toàn diện và đưa ra phản hồi chi tiết.

## Các tiêu chí đánh giá (5 tiêu chí chính)

### 1. **コンテンツカバレッジ (Content Coverage) - Độ bao phủ nội dung**
- Đánh giá xem giảng viên có giải thích đầy đủ các điểm chính trong slide hay không
- Kiểm tra mức độ chi tiết và đầy đủ của nội dung được trình bày

### 2. **構造の質 (Structure Quality) - Chất lượng cấu trúc**
- Đánh giá tính logic và nhất quán trong cách tổ chức và trình bày nội dung
- Kiểm tra sự liên kết giữa các phần và tính mạch lạc của bài giảng

### 3. **明確性 (Clarity) - Độ rõ ràng**
- Đánh giá mức độ dễ hiểu của cách diễn đạt và giải thích
- Kiểm tra xem thông tin có được truyền đạt một cách rõ ràng, dễ hiểu không

### 4. **エンゲージメント (Engagement) - Độ thu hút**
- Đánh giá mức độ hấp dẫn và khả năng thu hút sự chú ý của bài thuyết trình
- Kiểm tra tính tương tác và sự thú vị của nội dung

### 5. **時間管理 (Time Management) - Quản lý thời gian**
- Đánh giá sự phân bổ thời gian hợp lý cho từng phần
- Kiểm tra xem thời gian có được sử dụng hiệu quả không

## Đầu vào (Input)

### 1. Global Summary
- Tóm tắt tổng quan của toàn bộ slide deck
- Cung cấp context về nội dung chính của bài giảng

### 2. Slide Transcripts
- Mỗi transcript bao gồm:
  - `slide_page_number`: Số trang slide
  - `transcript_text`: Toàn bộ text đã được join từ các messages ghi âm
  - `slide_summary`: Tóm tắt của slide đó (nếu có)

## Đầu ra (Output)

Prompt yêu cầu trả về một JSON object với cấu trúc:

```json
{
  "overall_score": 0.0-1.0,           // Điểm tổng thể
  "overall_feedback": "...",          // Nhận xét tổng thể (tiếng Nhật)
  "content_coverage": 0.0-1.0,        // Độ bao phủ nội dung
  "structure_quality": 0.0-1.0,       // Chất lượng cấu trúc
  "clarity_score": 0.0-1.0,          // Độ rõ ràng
  "engagement_score": 0.0-1.0,       // Độ thu hút
  "time_management": 0.0-1.0,         // Quản lý thời gian
  "slide_analyses": [                 // Phân tích từng slide
    {
      "slide_page_number": 1,
      "score": 0.0-1.0,
      "feedback": "...",              // Nhận xét về slide này (tiếng Nhật)
      "strengths": ["...", "..."],    // Điểm mạnh (tiếng Nhật)
      "improvements": ["...", "..."]  // Điểm cần cải thiện (tiếng Nhật)
    }
  ],
  "strengths": ["...", "..."],        // Điểm mạnh tổng thể (tiếng Nhật)
  "improvements": ["...", "..."],    // Điểm cần cải thiện tổng thể (tiếng Nhật)
  "recommendations": ["...", "..."]   // Gợi ý cụ thể (tiếng Nhật)
}
```

## Yêu cầu đặc biệt

1. **Ngôn ngữ**: Tất cả các text field (feedback, strengths, improvements, recommendations) phải được viết bằng **tiếng Nhật**
2. **Định dạng**: Chỉ trả về JSON, không có text thêm
3. **Đánh giá**: Phải công bằng, khách quan
4. **Phản hồi**: Phải cụ thể và có thể thực hiện được
5. **Cân bằng**: Tập trung vào cả điểm mạnh và điểm cần cải thiện

## Quy trình xử lý

1. **Thu thập dữ liệu**: 
   - Lấy global summary từ slide deck
   - Lấy tất cả recordings và join messages thành transcript text
   - Lấy slide summary cho từng slide (nếu có)

2. **Tạo prompt**: 
   - Kết hợp global summary và tất cả slide transcripts
   - Format theo cấu trúc yêu cầu

3. **Gọi Gemini API**: 
   - Thử nhiều model names (gemini-1.5-flash, gemini-pro, etc.)
   - Xử lý response và parse JSON

4. **Xử lý kết quả**: 
   - Validate và set default values cho các field null
   - Lưu vào database
   - Cập nhật lecture status từ ANALYZING → COMPLETED

## Tính năng mới: Xóa và phân tích lại

- Khi lecture ở trạng thái COMPLETED, user có thể xóa phân tích hiện tại
- Khi xóa, status sẽ chuyển từ COMPLETED → ANALYZING
- Khi phân tích lại, hệ thống sẽ:
  - Lấy các recordings mới nhất (nếu user đã ghi âm lại)
  - Sử dụng global summary và slide summaries mới nhất
  - Tạo phân tích mới dựa trên dữ liệu mới nhất
  - Sau khi hoàn thành, status chuyển về COMPLETED

