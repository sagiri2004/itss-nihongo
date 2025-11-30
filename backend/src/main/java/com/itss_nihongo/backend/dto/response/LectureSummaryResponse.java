package com.itss_nihongo.backend.dto.response;

import com.itss_nihongo.backend.entity.LectureStatus;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LectureSummaryResponse {
    Long id;
    String title;
    String description;
    LectureStatus status;
    Instant createdAt;
    Instant updatedAt;
    SlideDeckSummaryResponse slideDeck;
}


