package com.itss_nihongo.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaveSlideRecordingRequest(
        @JsonProperty("lecture_id")
        @NotNull(message = "lecture_id is required")
        Long lectureId,

        @JsonProperty("slide_page_number")
        Integer slidePageNumber,

        @JsonProperty("recording_duration_sec")
        @NotNull(message = "recording_duration_sec is required")
        Integer recordingDurationSec,

        @JsonProperty("language_code")
        @NotBlank(message = "language_code is required")
        @Size(max = 10, message = "language_code must be at most 10 characters")
        String languageCode,

        @JsonProperty("messages")
        @NotNull(message = "messages is required")
        @jakarta.validation.constraints.NotEmpty(message = "messages must not be empty")
        List<@Valid MessageDto> messages
) {
    public record MessageDto(
            @JsonProperty("text")
            @NotBlank(message = "text is required")
            String text,

            @JsonProperty("relative_time_sec")
            @NotNull(message = "relative_time_sec is required")
            Integer relativeTimeSec,

            @JsonProperty("timestamp")
            @NotNull(message = "timestamp is required")
            Long timestamp
    ) {
    }
}

