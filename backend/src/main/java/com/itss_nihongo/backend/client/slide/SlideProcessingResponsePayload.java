package com.itss_nihongo.backend.client.slide;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import org.springframework.util.StringUtils;

public record SlideProcessingResponsePayload(
        @JsonProperty("presentation_id") String presentationId,
        @JsonProperty("lecture_id") Long lectureId,
        @JsonProperty("filename") String fileName,
        @JsonProperty("original_name") String originalName,
        @JsonProperty("slide_count") Integer slideCount,
        @JsonProperty("keywords_count") Integer keywordsCount,
        @JsonProperty("has_embeddings") Boolean hasEmbeddings,
        @JsonProperty("all_summary") String allSummary,
        List<SlideInfoPayload> slides) {

    public int slideCountOrDefault() {
        return slideCount != null ? slideCount : 0;
    }

    public int keywordsCountOrDefault() {
        return keywordsCount != null ? keywordsCount : 0;
    }

    public boolean hasEmbeddingsOrDefault() {
        return Boolean.TRUE.equals(hasEmbeddings);
    }

    public String resolvedFileName() {
        if (StringUtils.hasText(fileName)) {
            return fileName;
        }
        if (StringUtils.hasText(originalName)) {
            return originalName;
        }
        return null;
    }
}

