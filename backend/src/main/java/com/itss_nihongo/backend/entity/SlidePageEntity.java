package com.itss_nihongo.backend.entity;

import com.itss_nihongo.backend.common.converter.StringListJsonConverter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(
    name = "slide_pages",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_slide_deck_page_number", columnNames = {"slide_deck_id", "page_number"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"slideDeck"})
public class SlidePageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slide_deck_id", nullable = false)
    private SlideDeckEntity slideDeck;

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(length = 255)
    private String title;

    @Column(name = "content_summary", columnDefinition = "TEXT", nullable = false)
    private String contentSummary;

    @Column(name = "all_text", columnDefinition = "LONGTEXT")
    private String allText;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "headings", columnDefinition = "LONGTEXT")
    @Builder.Default
    private List<String> headings = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "bullets", columnDefinition = "LONGTEXT")
    @Builder.Default
    private List<String> bullets = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "body_text", columnDefinition = "LONGTEXT")
    @Builder.Default
    private List<String> body = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "keywords", columnDefinition = "LONGTEXT")
    @Builder.Default
    private List<String> keywords = new ArrayList<>();

    @Column(name = "preview_url", length = 512)
    private String previewUrl;

    @OneToMany(mappedBy = "slidePage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PageScriptEntity> scripts = new ArrayList<>();

    @OneToMany(mappedBy = "slidePage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PageTimingEntity> timings = new ArrayList<>();
}

