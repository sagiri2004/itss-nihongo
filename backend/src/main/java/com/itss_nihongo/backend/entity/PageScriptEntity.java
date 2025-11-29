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
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "page_scripts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"slidePage", "audioRecording"})
public class PageScriptEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slide_page_id", nullable = false)
    private SlidePageEntity slidePage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_recording_id")
    private AudioRecordingEntity audioRecording;

    @Column(name = "start_second", precision = 10, scale = 2)
    private BigDecimal startSecond;

    @Column(name = "end_second", precision = 10, scale = 2)
    private BigDecimal endSecond;

    @Column(name = "transcript_text", columnDefinition = "TEXT", nullable = false)
    private String transcriptText;

    @Column(name = "confidence_score", precision = 5, scale = 3)
    private BigDecimal confidenceScore;
}

