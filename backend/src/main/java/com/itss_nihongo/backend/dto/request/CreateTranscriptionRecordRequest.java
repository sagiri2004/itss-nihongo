package com.itss_nihongo.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateTranscriptionRecordRequest(
        @JsonProperty("lecture_id")
        @NotNull(message = "lecture_id is required")
        Long lectureId,

        @JsonProperty("session_id")
        @NotBlank(message = "session_id is required")
        @Size(max = 64, message = "session_id must be at most 64 characters")
        String sessionId,

        @JsonProperty("presentation_id")
        @Size(max = 64, message = "presentation_id must be at most 64 characters")
        String presentationId,

        @JsonProperty("text")
        @NotBlank(message = "text is required")
        String text,

        @JsonProperty("confidence")
        BigDecimal confidence,

        @JsonProperty("timestamp")
        BigDecimal timestamp,

        @JsonProperty("is_final")
        boolean isFinal,

        @JsonProperty("slide_number")
        Integer slideNumber,

        @JsonProperty("slide_score")
        BigDecimal slideScore,

        @JsonProperty("slide_confidence")
        BigDecimal slideConfidence,

        @JsonProperty("matched_keywords")
        List<String> matchedKeywords
) {
}


