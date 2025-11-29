package com.itss_nihongo.backend.client.slide;

public record SlideProcessingRequestPayload(Long lectureId, String gcsUri, String originalName) {
}


