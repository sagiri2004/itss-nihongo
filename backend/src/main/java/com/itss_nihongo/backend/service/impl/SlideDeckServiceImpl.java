package com.itss_nihongo.backend.service.impl;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import com.itss_nihongo.backend.client.slide.SlideInfoPayload;
import com.itss_nihongo.backend.client.slide.SlideProcessingClient;
import com.itss_nihongo.backend.client.slide.SlideProcessingResponsePayload;
import com.itss_nihongo.backend.config.GcpStorageProperties;
import com.itss_nihongo.backend.dto.response.SlideDeckResponse;
import com.itss_nihongo.backend.entity.AssetStatus;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.SlideDeckEntity;
import com.itss_nihongo.backend.entity.SlidePageEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.entity.HistoryEntity;
import com.itss_nihongo.backend.entity.LectureStatus;
import com.itss_nihongo.backend.repository.HistoryRepository;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideDeckRepository;
import com.itss_nihongo.backend.service.SlideDeckService;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class SlideDeckServiceImpl implements SlideDeckService {

    private static final Logger log = LoggerFactory.getLogger(SlideDeckServiceImpl.class);

    private final LectureRepository lectureRepository;
    private final SlideDeckRepository slideDeckRepository;
    private final Storage storage;
    private final GcpStorageProperties properties;
    private final SlideProcessingClient slideProcessingClient;
    private final com.itss_nihongo.backend.service.SlideProcessingNotificationService notificationService;
    private final HistoryRepository historyRepository;

    public SlideDeckServiceImpl(LectureRepository lectureRepository,
                                SlideDeckRepository slideDeckRepository,
                                Storage storage,
                                GcpStorageProperties properties,
                                SlideProcessingClient slideProcessingClient,
                                com.itss_nihongo.backend.service.SlideProcessingNotificationService notificationService,
                                HistoryRepository historyRepository) {
        this.lectureRepository = lectureRepository;
        this.slideDeckRepository = slideDeckRepository;
        this.storage = storage;
        this.properties = properties;
        this.slideProcessingClient = slideProcessingClient;
        this.notificationService = notificationService;
        this.historyRepository = historyRepository;
    }

    @Override
    public SlideDeckResponse uploadSlideDeck(Long lectureId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_FILE_UPLOAD, "Uploaded slide deck is empty");
        }

        LectureEntity lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        String objectKey = uploadToStorage(file);

        SlideDeckEntity slideDeck = lecture.getSlideDeck();
        if (slideDeck == null) {
            slideDeck = new SlideDeckEntity();
            slideDeck.setLecture(lecture);
            slideDeck.setPageCount(0);
        }

        slideDeck.setGcpAssetId(objectKey);
        slideDeck.setOriginalName(file.getOriginalFilename());
        slideDeck.setUploadStatus(AssetStatus.UPLOADED);

        SlideDeckEntity saved = slideDeckRepository.save(slideDeck);
        lecture.setSlideDeck(saved);

        // Update lecture status to SLIDE_UPLOAD
        LectureStatus oldStatus = lecture.getStatus();
        lecture.setStatus(LectureStatus.SLIDE_UPLOAD);
        lectureRepository.save(lecture);

        // Create history record for status change
        if (oldStatus != LectureStatus.SLIDE_UPLOAD) {
            HistoryEntity history = HistoryEntity.builder()
                    .user(lecture.getUser())
                    .lecture(lecture)
                    .action(HistoryEntity.HistoryAction.UPDATED)
                    .description(String.format("Uploaded slide deck. Status changed from %s to %s", oldStatus, LectureStatus.SLIDE_UPLOAD))
                    .build();
            historyRepository.save(history);
        }

        triggerSlideProcessing(lecture, saved);

        return toResponse(saved);
    }

    @Override
    public SlideDeckResponse reprocessSlideDeck(Long lectureId) {
        LectureEntity lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        SlideDeckEntity slideDeck = lecture.getSlideDeck();
        if (slideDeck == null || !StringUtils.hasText(slideDeck.getGcpAssetId())) {
            throw new AppException(ErrorCode.INVALID_FILE_UPLOAD, "Slide deck is not available for re-processing");
        }

        log.info("Re-processing slide deck {} for lecture {}", slideDeck.getId(), lectureId);
        triggerSlideProcessing(lecture, slideDeck);
        slideDeckRepository.flush();

        return toResponse(slideDeck);
    }

    @Override
    public void reprocessAllSlideDecks() {
        List<SlideDeckEntity> slideDecks = slideDeckRepository.findAll();
        for (SlideDeckEntity slideDeck : slideDecks) {
            LectureEntity lecture = slideDeck.getLecture();
            if (lecture == null) {
                log.warn("Skipping slide deck {} because lecture is not available", slideDeck.getId());
                continue;
            }
            if (!StringUtils.hasText(slideDeck.getGcpAssetId())) {
                log.warn("Skipping slide deck {} because GCS asset is missing", slideDeck.getId());
                continue;
            }
            try {
                log.info("Re-processing slide deck {} (lecture {})", slideDeck.getId(), lecture.getId());
                triggerSlideProcessing(lecture, slideDeck);
            } catch (AppException ex) {
                log.error("Failed to re-process slide deck {}: {}", slideDeck.getId(), ex.getMessage());
            }
        }
        slideDeckRepository.flush();
    }

    private SlideDeckResponse toResponse(SlideDeckEntity entity) {
        return SlideDeckResponse.builder()
                .id(entity.getId())
                .lectureId(entity.getLecture().getId())
                .gcpAssetId(entity.getGcpAssetId())
                .originalName(entity.getOriginalName())
                .processedFileName(entity.getProcessedFileName())
                .presentationId(entity.getPresentationId())
                .pageCount(entity.getPageCount())
                .keywordsCount(entity.getKeywordsCount())
                .hasEmbeddings(entity.getHasEmbeddings())
                .contentSummary(entity.getContentSummary())
                .allSummary(entity.getAllSummary())
                .uploadStatus(entity.getUploadStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private String uploadToStorage(MultipartFile file) {
        String bucket = properties.getStorage().getBucket();
        if (!StringUtils.hasText(bucket)) {
            throw new IllegalStateException("GCP storage bucket is not configured");
        }

        String slidesFolder = properties.getStorage().getSlidesFolder();
        String basePath = StringUtils.hasText(slidesFolder) ? slidesFolder.trim() : "";

        String originalName = file.getOriginalFilename();
        String sanitizedFileName = StringUtils.hasText(originalName)
                ? originalName.replaceAll("[^A-Za-z0-9._-]", "_")
                : "slides";

        String objectName = "%s%s%s-%s".formatted(
                basePath.isEmpty() ? "" : basePath + "/",
                Instant.now().toEpochMilli(),
                UUID.randomUUID().toString().substring(0, 8),
                sanitizedFileName
        );

        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucket, objectName))
                .setContentType(file.getContentType())
                .build();

        try (InputStream inputStream = file.getInputStream()) {
            storage.createFrom(blobInfo, inputStream);
            return objectName;
        } catch (IOException | StorageException ex) {
            throw new AppException(ErrorCode.SLIDE_UPLOAD_FAILED, "Failed to upload slide deck to storage", ex);
        }
    }

    private void triggerSlideProcessing(LectureEntity lecture, SlideDeckEntity slideDeck) {
        String bucket = properties.getStorage().getBucket();
        if (!StringUtils.hasText(bucket)) {
            log.warn("Cannot trigger slide processing because bucket is not configured");
            return;
        }

        if (!slideProcessingClient.isConfigured()) {
            log.warn("Slide processing service base URL is not configured. Skipping processing.");
            return;
        }

        String objectKey = slideDeck.getGcpAssetId();
        if (!StringUtils.hasText(objectKey)) {
            log.warn("Slide deck {} has no GCS object key", slideDeck.getId());
            return;
        }

        String gcsUri = "gs://%s/%s".formatted(bucket, objectKey);
        slideDeck.setUploadStatus(AssetStatus.PROCESSING);
        slideDeckRepository.save(slideDeck);

        Optional<SlideProcessingResponsePayload> response =
                slideProcessingClient.processSlides(lecture.getId(), gcsUri, slideDeck.getOriginalName());

        if (response.isPresent()) {
            updateSlideDeckWithProcessingResult(slideDeck, response.get());
            // Notify via WebSocket that processing is complete
            notificationService.notifySlideProcessingComplete(
                    lecture.getId(), 
                    slideDeck.getId(), 
                    slideDeck.getUploadStatus()
            );
        } else {
            handleSlideProcessingFailure(slideDeck);
            // Notify via WebSocket that processing failed
            notificationService.notifySlideProcessingComplete(
                    lecture.getId(), 
                    slideDeck.getId(), 
                    slideDeck.getUploadStatus()
            );
        }
    }

    private void updateSlideDeckWithProcessingResult(SlideDeckEntity slideDeck,
                                                     SlideProcessingResponsePayload response) {
        if (response.slides() == null || response.slides().isEmpty()) {
            log.warn("Slide processing response for deck {} contained no slides. Marking as failed.", slideDeck.getId());
            handleSlideProcessingFailure(slideDeck);
            return;
        }

        slideDeck.setPageCount(Math.max(response.slideCountOrDefault(), safeSize(response.slides())));
        slideDeck.setKeywordsCount(response.keywordsCountOrDefault());
        slideDeck.setHasEmbeddings(response.hasEmbeddingsOrDefault());

        if (StringUtils.hasText(response.presentationId())) {
            slideDeck.setPresentationId(response.presentationId());
        }

        String resolvedFileName = response.resolvedFileName();
        if (StringUtils.hasText(resolvedFileName)) {
            slideDeck.setProcessedFileName(resolvedFileName);
            if (!StringUtils.hasText(slideDeck.getOriginalName())) {
                slideDeck.setOriginalName(resolvedFileName);
            }
        }

        if (StringUtils.hasText(response.allSummary())) {
            slideDeck.setAllSummary(response.allSummary().trim());
        }
        slideDeck.setContentSummary(buildDeckSummary(response));

        if (slideDeck.getPages() == null) {
            slideDeck.setPages(new ArrayList<>());
        }

        slideDeck.getPages().clear();
        slideDeckRepository.flush();

        Set<Integer> usedPageNumbers = new HashSet<>();
        int fallbackPageNumber = 1;

        if (response.slides() != null) {
            for (SlideInfoPayload slideInfo : response.slides()) {
                SlidePageEntity page = new SlidePageEntity();
                page.setSlideDeck(slideDeck);
                int requestedNumber = slideInfo.slideId();
                int pageNumber = requestedNumber > 0 ? requestedNumber : fallbackPageNumber;
                if (pageNumber <= 0 || usedPageNumbers.contains(pageNumber)) {
                    int originalNumber = pageNumber;
                    pageNumber = fallbackPageNumber;
                    while (usedPageNumbers.contains(pageNumber)) {
                        pageNumber++;
                    }
                    log.warn("Slide processing returned duplicate/invalid page number {} for deck {}. Remapped to {}.",
                            originalNumber, slideDeck.getId(), pageNumber);
                }
                usedPageNumbers.add(pageNumber);
                fallbackPageNumber = Math.max(fallbackPageNumber, pageNumber + 1);
                page.setPageNumber(pageNumber);
                
                // Simplified: Only save keywords and summary from Gemini processing
                String summary = normalizeSummary(slideInfo.summary(), 2000);
                page.setSummary(summary);
                page.setContentSummary(summary != null ? summary : "");
                page.setKeywords(new ArrayList<>(copyToList(slideInfo.keywords())));
                
                // Set empty/default values for removed fields
                page.setTitle(null);
                page.setAllText(null);
                page.setHeadings(new ArrayList<>());
                page.setBullets(new ArrayList<>());
                page.setBody(new ArrayList<>());
                
                slideDeck.getPages().add(page);
            }
        }

        if (slideDeck.getPages().isEmpty()) {
            log.warn("Slide deck {} still has zero pages after processing. Marking as failed.", slideDeck.getId());
            handleSlideProcessingFailure(slideDeck);
            return;
        }

        slideDeck.setUploadStatus(AssetStatus.READY);
        slideDeckRepository.save(slideDeck);
        log.info("Slide deck {} processed successfully with {} pages", slideDeck.getId(), slideDeck.getPageCount());
    }

    private void handleSlideProcessingFailure(SlideDeckEntity slideDeck) {
        slideDeck.setUploadStatus(AssetStatus.FAILED);
        slideDeckRepository.save(slideDeck);
        log.error("Slide processing failed for slide deck {}", slideDeck.getId());
    }

    private String buildDeckSummary(SlideProcessingResponsePayload response) {
        String normalized = normalizeSummary(response.allSummary(), 4000);
        if (normalized != null) {
            return normalized;
        }

        return "Processed %d slides with %d keywords (embeddings: %s)".formatted(
                response.slideCountOrDefault(),
                response.keywordsCountOrDefault(),
                response.hasEmbeddingsOrDefault() ? "enabled" : "disabled"
        );
    }

    private String buildSlideFallbackSummary(SlideInfoPayload slideInfo) {
        // Simplified: Use summary if available, otherwise use slide ID
        String summary = slideInfo.summary();
        if (StringUtils.hasText(summary)) {
            return truncate(summary.trim(), 2000);
        }
        return "Slide %d".formatted(slideInfo.slideId());
    }

    private String normalizeSummary(String summary, int maxLength) {
        if (!StringUtils.hasText(summary)) {
            return null;
        }
        return truncate(summary.trim(), maxLength);
    }

    private List<String> copyToList(List<String> source) {
        if (source == null) {
            return List.of();
        }
        return source.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .toList();
    }

    private int safeSize(Collection<?> collection) {
        return collection == null ? 0 : collection.size();
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value) || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}


