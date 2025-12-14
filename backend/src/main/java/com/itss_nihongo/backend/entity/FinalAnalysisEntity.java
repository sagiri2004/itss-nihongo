package com.itss_nihongo.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "final_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class FinalAnalysisEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecture_id", nullable = false)
    private LectureEntity lecture;

    @Column(name = "overall_score", nullable = false)
    private Double overallScore;

    @Column(name = "overall_feedback", columnDefinition = "TEXT", nullable = false)
    private String overallFeedback;

    @Column(name = "content_coverage", nullable = false)
    private Double contentCoverage;

    @Column(name = "structure_quality", nullable = false)
    private Double structureQuality;

    @Column(name = "clarity_score", nullable = false)
    private Double clarityScore;

    @Column(name = "engagement_score", nullable = false)
    private Double engagementScore;

    @Column(name = "time_management", nullable = false)
    private Double timeManagement;

    @Column(name = "strengths", columnDefinition = "TEXT")
    private String strengths; // JSON array as string

    @Column(name = "improvements", columnDefinition = "TEXT")
    private String improvements; // JSON array as string

    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations; // JSON array as string

    @OneToMany(mappedBy = "finalAnalysis", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FinalAnalysisSlideEntity> slideAnalyses = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}

