package com.itss_nihongo.backend.entity;

import com.itss_nihongo.backend.common.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "transcription_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"lecture"})
public class TranscriptionRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecture_id", nullable = false)
    private LectureEntity lecture;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "presentation_id", length = 64)
    private String presentationId;

    @Column(name = "transcript_text", nullable = false, columnDefinition = "TEXT")
    private String transcriptText;

    @Column(name = "confidence", precision = 5, scale = 3)
    private BigDecimal confidence;

    @Column(name = "is_final", nullable = false)
    private boolean finalResult;

    @Column(name = "event_timestamp", precision = 10, scale = 3)
    private BigDecimal eventTimestamp;

    @Column(name = "slide_number")
    private Integer slideNumber;

    @Column(name = "slide_score", precision = 6, scale = 3)
    private BigDecimal slideScore;

    @Column(name = "slide_confidence", precision = 6, scale = 3)
    private BigDecimal slideConfidence;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "matched_keywords", columnDefinition = "LONGTEXT")
    @Builder.Default
    private List<String> matchedKeywords = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = Instant.now();
    }
}


