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
    String processedFileName;
    String presentationId;
    Integer pageCount;
    Integer keywordsCount;
    Boolean hasEmbeddings;
    AssetStatus uploadStatus;
    String contentSummary;
    String allSummary;
    Instant createdAt;
    String signedUrl;
    List<SlidePageResponse> pages;
}


