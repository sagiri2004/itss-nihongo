package com.itss_nihongo.backend.client.slide;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Simplified slide info payload from Gemini-based processing.
 * Only contains: slide_id, keywords, summary
 */
public record SlideInfoPayload(
        @JsonProperty("slide_id") int slideId,
        List<String> keywords,
        @JsonProperty("summary") String summary) {
}

