package com.itss_nihongo.backend.dto.response;

import com.itss_nihongo.backend.entity.AssetStatus;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlideDeckSummaryResponse {
    Long id;
    String gcpAssetId;
    String originalName;
    Integer pageCount;
    AssetStatus uploadStatus;
}


