package com.itss_nihongo.backend.dto.response;

import com.itss_nihongo.backend.entity.AssetStatus;
import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlideDeckDetailResponse {
    Long id;
    String gcpAssetId;
    String originalName;
    Integer pageCount;
    AssetStatus uploadStatus;
    String contentSummary;
    Instant createdAt;
    String signedUrl;
    List<SlidePageResponse> pages;
}


