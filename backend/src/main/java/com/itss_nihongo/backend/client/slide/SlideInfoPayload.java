package com.itss_nihongo.backend.client.slide;

import java.util.List;

public record SlideInfoPayload(int slideId, String title, String content, List<String> keywords) {
}


