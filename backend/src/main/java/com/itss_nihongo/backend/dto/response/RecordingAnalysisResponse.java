package com.itss_nihongo.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RecordingAnalysisResponse {
    @JsonProperty("id")
    Long id;

    @JsonProperty("recording_id")
    Long recordingId;

    @JsonProperty("context_accuracy")
    BigDecimal contextAccuracy;

    @JsonProperty("content_completeness")
    BigDecimal contentCompleteness;

    @JsonProperty("context_relevance")
    BigDecimal contextRelevance;

    @JsonProperty("average_speech_rate")
    BigDecimal averageSpeechRate;

    @JsonProperty("feedback")
    String feedback;

    @JsonProperty("suggestions")
    List<String> suggestions;

    @JsonProperty("analyzed_at")
    Instant analyzedAt;
}

