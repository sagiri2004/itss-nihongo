package com.itss_nihongo.backend.service.impl;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import com.itss_nihongo.backend.client.slide.SlideProcessingClient;
import com.itss_nihongo.backend.client.slide.SlideProcessingResponsePayload;
import com.itss_nihongo.backend.config.GcpStorageProperties;
import com.itss_nihongo.backend.dto.response.SlideDeckResponse;
import com.itss_nihongo.backend.entity.AssetStatus;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.SlideDeckEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideDeckRepository;
import com.itss_nihongo.backend.service.SlideDeckService;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
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

    public SlideDeckServiceImpl(LectureRepository lectureRepository,
                                SlideDeckRepository slideDeckRepository,
                                Storage storage,
                                GcpStorageProperties properties,
                                SlideProcessingClient slideProcessingClient) {
        this.lectureRepository = lectureRepository;
        this.slideDeckRepository = slideDeckRepository;
        this.storage = storage;
        this.properties = properties;
        this.slideProcessingClient = slideProcessingClient;
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

        triggerSlideProcessing(lecture, saved);

        return toResponse(saved);
    }

    private SlideDeckResponse toResponse(SlideDeckEntity entity) {
        return SlideDeckResponse.builder()
                .id(entity.getId())
                .lectureId(entity.getLecture().getId())
                .gcpAssetId(entity.getGcpAssetId())
                .originalName(entity.getOriginalName())
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

        String objectKey = slideDeck.getGcpAssetId();
        if (!StringUtils.hasText(objectKey)) {
            log.warn("Slide deck {} has no GCS object key", slideDeck.getId());
            return;
        }

        String gcsUri = "gs://%s/%s".formatted(bucket, objectKey);
        slideProcessingClient.processSlides(lecture.getId(), gcsUri, slideDeck.getOriginalName())
                .ifPresent(response -> updateSlideDeckWithProcessingResult(slideDeck, response));
    }

    private void updateSlideDeckWithProcessingResult(SlideDeckEntity slideDeck,
                                                     SlideProcessingResponsePayload response) {
        slideDeck.setPageCount(response.slideCount());
        slideDeck.setContentSummary("Processed %d slides, %d keywords".formatted(
                response.slideCount(),
                response.keywordsCount()
        ));
        slideDeck.setUploadStatus(AssetStatus.READY);
        slideDeckRepository.save(slideDeck);
    }
}


