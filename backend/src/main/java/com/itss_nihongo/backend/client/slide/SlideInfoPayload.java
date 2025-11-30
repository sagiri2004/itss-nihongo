package com.itss_nihongo.backend.client.slide;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record SlideInfoPayload(
        @JsonProperty("slide_id") int slideId,
        String title,
        List<String> headings,
        List<String> bullets,
        @JsonProperty("body") List<String> body,
        List<String> keywords,
        @JsonProperty("all_text") String allText) {
}

