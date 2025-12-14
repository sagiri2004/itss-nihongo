package com.itss_nihongo.backend.dto.response;

import com.itss_nihongo.backend.entity.HistoryEntity;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoryResponse {

    private Long id;
    private Long lectureId;
    private String lectureTitle;
    private HistoryAction action;
    private String description;
    private Instant createdAt;

    public enum HistoryAction {
        CREATED,
        UPDATED,
        DELETED,
        SLIDE_UPLOADED,
        SLIDE_PROCESSED,
        RECORDING_STARTED,
        RECORDING_COMPLETED
    }

    public static HistoryResponse fromEntity(HistoryEntity entity) {
        return HistoryResponse.builder()
                .id(entity.getId())
                .lectureId(entity.getLecture() != null ? entity.getLecture().getId() : null)
                .lectureTitle(entity.getLecture() != null ? entity.getLecture().getTitle() : null)
                .action(HistoryAction.valueOf(entity.getAction().name()))
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

