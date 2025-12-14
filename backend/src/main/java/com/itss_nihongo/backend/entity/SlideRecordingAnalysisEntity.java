package com.itss_nihongo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "slide_recording_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"recording"})
public class SlideRecordingAnalysisEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recording_id", nullable = false, unique = true)
    private SlideRecordingEntity recording;

    @Column(name = "context_accuracy", precision = 3, scale = 2)
    private BigDecimal contextAccuracy;

    @Column(name = "content_completeness", precision = 3, scale = 2)
    private BigDecimal contentCompleteness;

    @Column(name = "context_relevance", precision = 3, scale = 2)
    private BigDecimal contextRelevance;

    @Column(name = "average_speech_rate", precision = 6, scale = 2)
    private BigDecimal averageSpeechRate; // Words per minute

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "suggestions", columnDefinition = "TEXT")
    private String suggestions; // JSON array as string

    @Column(name = "analyzed_at", nullable = false, updatable = false)
    private Instant analyzedAt;

    @PrePersist
    public void onCreate() {
        this.analyzedAt = Instant.now();
    }
}

