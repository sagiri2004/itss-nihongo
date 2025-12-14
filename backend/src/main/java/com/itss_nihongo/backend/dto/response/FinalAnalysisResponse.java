package com.itss_nihongo.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinalAnalysisResponse {
    
    private Long id;
    
    @JsonProperty("lecture_id") // Map from snake_case
    private Long lectureId;
    
    // Đánh giá tổng thể
    @JsonProperty("overall_score") // Map from snake_case
    private Double overallScore; // Điểm tổng thể (0-1)
    
    @JsonProperty("overall_feedback") // Map from snake_case
    private String overallFeedback; // Nhận xét tổng thể
    
    // Đánh giá chi tiết
    @JsonProperty("content_coverage") // Map from snake_case
    private Double contentCoverage; // Độ bao phủ nội dung (0-1)
    
    @JsonProperty("structure_quality") // Map from snake_case
    private Double structureQuality; // Chất lượng cấu trúc (0-1)
    
    @JsonProperty("clarity_score") // Map from snake_case
    private Double clarityScore; // Độ rõ ràng (0-1)
    
    @JsonProperty("engagement_score") // Map from snake_case
    private Double engagementScore; // Độ thu hút (0-1)
    
    @JsonProperty("time_management") // Map from snake_case
    private Double timeManagement; // Quản lý thời gian (0-1)
    
    // Phân tích theo slide
    @JsonProperty("slide_analyses") // Map from snake_case
    private List<SlideAnalysis> slideAnalyses;
    
    // Điểm mạnh
    private List<String> strengths;
    
    // Điểm cần cải thiện
    private List<String> improvements;
    
    // Gợi ý cụ thể
    private List<String> recommendations;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SlideAnalysis {
        @JsonProperty("slide_page_number") // Map from snake_case
        private Integer slidePageNumber;
        
        private Double score;
        private String feedback;
        private List<String> strengths;
        private List<String> improvements;
    }
}

