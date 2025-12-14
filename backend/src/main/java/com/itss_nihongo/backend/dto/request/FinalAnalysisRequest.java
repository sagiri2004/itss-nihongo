package com.itss_nihongo.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinalAnalysisRequest {
    
    @NotNull(message = "lecture_id is required")
    @JsonProperty("lecture_id")
    private Long lectureId;
    
    @JsonProperty("global_summary")
    private String globalSummary; // Slide tổng (global summary)
    
    @JsonProperty("slide_transcripts")
    private List<SlideTranscript> slideTranscripts; // Tất cả transcripts từ các slide
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlideTranscript {
        @JsonProperty("slide_page_number")
        private Integer slidePageNumber;
        
        @JsonProperty("transcript_text")
        private String transcriptText; // Tất cả messages đã được join lại
        
        @JsonProperty("slide_summary")
        private String slideSummary; // Summary của slide đó (nếu có)
        
        @JsonProperty("slide_image_url")
        private String slideImageUrl; // URL của slide image từ GCP (nếu có)
    }
}

