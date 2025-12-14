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
import lombok.ToString;

@Entity
@Table(name = "slide_recordings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"lecture", "messages"})
public class SlideRecordingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lecture_id", nullable = false)
    private LectureEntity lecture;

    @Column(name = "slide_page_number")
    private Integer slidePageNumber;

    @Column(name = "recording_duration_sec", nullable = false)
    private Integer recordingDurationSec;

    @Column(name = "language_code", length = 10, nullable = false)
    private String languageCode;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @OneToMany(mappedBy = "recording", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SlideRecordingMessageEntity> messages = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        this.submittedAt = Instant.now();
    }
}

