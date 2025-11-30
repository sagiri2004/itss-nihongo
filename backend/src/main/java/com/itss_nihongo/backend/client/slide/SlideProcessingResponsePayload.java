package com.itss_nihongo.backend.client.slide;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record SlideProcessingResponsePayload(
        @JsonProperty("lecture_id") Long lectureId,
        @JsonProperty("original_name") String originalName,
        @JsonProperty("slide_count") int slideCount,
        @JsonProperty("keywords_count") int keywordsCount,
        @JsonProperty("has_embeddings") boolean hasEmbeddings,
        List<SlideInfoPayload> slides) {
}

