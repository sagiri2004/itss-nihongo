package com.itss_nihongo.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlideRecordingResponse {
    @JsonProperty("id")
    Long id;

    @JsonProperty("lecture_id")
    Long lectureId;

    @JsonProperty("slide_page_number")
    Integer slidePageNumber;

    @JsonProperty("recording_duration_sec")
    Integer recordingDurationSec;

    @JsonProperty("language_code")
    String languageCode;

    @JsonProperty("submitted_at")
    Instant submittedAt;

    @JsonProperty("messages")
    List<MessageResponse> messages;

    @Value
    @Builder
    public static class MessageResponse {
        @JsonProperty("id")
        Long id;

        @JsonProperty("text")
        String text;

        @JsonProperty("relative_time_sec")
        Integer relativeTimeSec;

        @JsonProperty("timestamp")
        Instant timestamp;
    }
}

