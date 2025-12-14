package com.itss_nihongo.backend.dto.response;

import java.time.Instant;
import lombok.Builder;

@Builder
public record NotificationResponse(
        Long id,
        Long lectureId,
        String lectureTitle,
        String title,
        String message,
        Boolean isRead,
        Instant createdAt
) {
}

