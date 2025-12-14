package com.itss_nihongo.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record SaveRecordingAnalysisRequest(
        @JsonProperty("recording_id")
        @NotNull(message = "recording_id is required")
        Long recordingId,

        @JsonProperty("context_accuracy")
        @NotNull(message = "context_accuracy is required")
        BigDecimal contextAccuracy,

        @JsonProperty("content_completeness")
        @NotNull(message = "content_completeness is required")
        BigDecimal contentCompleteness,

        @JsonProperty("context_relevance")
        @NotNull(message = "context_relevance is required")
        BigDecimal contextRelevance,

        @JsonProperty("average_speech_rate")
        @NotNull(message = "average_speech_rate is required")
        BigDecimal averageSpeechRate,

        @JsonProperty("feedback")
        String feedback,

        @JsonProperty("suggestions")
        List<String> suggestions
) {
}

