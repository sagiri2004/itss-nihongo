package com.itss_nihongo.backend.client.slide;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SlideProcessingRequestPayload(
        @JsonProperty("lecture_id") Long lectureId,
        @JsonProperty("gcs_uri") String gcsUri,
        @JsonProperty("original_name") String originalName,
        @JsonProperty("use_embeddings") boolean useEmbeddings) {

    public SlideProcessingRequestPayload(Long lectureId, String gcsUri, String originalName) {
        this(lectureId, gcsUri, originalName, true);
    }
}

