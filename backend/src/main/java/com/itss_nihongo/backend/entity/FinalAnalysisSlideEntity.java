package com.itss_nihongo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "final_analysis_slides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class FinalAnalysisSlideEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "final_analysis_id", nullable = false)
    private FinalAnalysisEntity finalAnalysis;

    @Column(name = "slide_page_number", nullable = false)
    private Integer slidePageNumber;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "feedback", columnDefinition = "TEXT", nullable = false)
    private String feedback;

    @Column(name = "strengths", columnDefinition = "TEXT")
    private String strengths; // JSON array as string

    @Column(name = "improvements", columnDefinition = "TEXT")
    private String improvements; // JSON array as string
}

