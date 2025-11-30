package com.itss_nihongo.backend.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlideDeckFileResponse {
    byte[] content;
    String fileName;
    String contentType;
}


