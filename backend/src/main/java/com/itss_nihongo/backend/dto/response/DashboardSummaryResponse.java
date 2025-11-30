package com.itss_nihongo.backend.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DashboardSummaryResponse {
    long totalLectures;
    long totalSlideDecks;
    long totalTranscriptionRecords;
    List<LectureSummaryResponse> recentLectures;
}


