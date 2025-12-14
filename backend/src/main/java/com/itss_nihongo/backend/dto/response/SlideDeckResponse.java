package com.itss_nihongo.backend.dto.response;

import com.itss_nihongo.backend.entity.AssetStatus;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlideDeckResponse {
    Long id;
    Long lectureId;
    String gcpAssetId;
    String originalName;
    String processedFileName;
    String presentationId;
    Integer pageCount;
    Integer keywordsCount;
    Boolean hasEmbeddings;
    String contentSummary;
    String allSummary;
    AssetStatus uploadStatus;
    Instant createdAt;
}


