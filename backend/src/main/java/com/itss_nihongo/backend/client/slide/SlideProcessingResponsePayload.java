package com.itss_nihongo.backend.client.slide;

import java.util.List;

public record SlideProcessingResponsePayload(
        Long lectureId,
        int slideCount,
        int keywordsCount,
        boolean hasEmbeddings,
        List<SlideInfoPayload> slides) {
}


