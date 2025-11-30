package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.request.CreateLectureRequest;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import com.itss_nihongo.backend.config.GcpStorageProperties;
import com.itss_nihongo.backend.dto.response.LectureDetailResponse;
import com.itss_nihongo.backend.dto.response.LectureResponse;
import com.itss_nihongo.backend.dto.response.LectureSummaryResponse;
import com.itss_nihongo.backend.dto.response.SlideDeckDetailResponse;
import com.itss_nihongo.backend.dto.response.SlideDeckFileResponse;
import com.itss_nihongo.backend.dto.response.SlideDeckSummaryResponse;
import com.itss_nihongo.backend.dto.response.SlidePageResponse;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.SlideDeckEntity;
import com.itss_nihongo.backend.entity.SlidePageEntity;
import com.itss_nihongo.backend.entity.UserEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.service.LectureService;
import com.itss_nihongo.backend.service.UserService;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class LectureServiceImpl implements LectureService {

    private static final Logger log = LoggerFactory.getLogger(LectureServiceImpl.class);
    private static final long SIGNED_URL_DURATION_MINUTES = 30;

    private final LectureRepository lectureRepository;
    private final UserService userService;
    private final Storage storage;
    private final GcpStorageProperties storageProperties;

    public LectureServiceImpl(LectureRepository lectureRepository,
                              UserService userService,
                              Storage storage,
                              GcpStorageProperties storageProperties) {
        this.lectureRepository = lectureRepository;
        this.userService = userService;
        this.storage = storage;
        this.storageProperties = storageProperties;
    }

    @Override
    public LectureResponse createLecture(String username, CreateLectureRequest request) {
        UserEntity owner = userService.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        LectureEntity lecture = LectureEntity.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .user(owner)
                .build();

        LectureEntity saved = lectureRepository.save(lecture);
        return LectureResponse.builder()
                .id(saved.getId())
                .title(saved.getTitle())
                .description(saved.getDescription())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LectureSummaryResponse> getLectures(Integer limit) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<LectureEntity> lectures;

        if (limit != null && limit > 0) {
            lectures = lectureRepository.findAll(PageRequest.of(0, limit, sort)).getContent();
        } else {
            lectures = lectureRepository.findAll(sort);
        }

        return lectures.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LectureDetailResponse getLecture(Long lectureId) {
        LectureEntity lecture = lectureRepository.findDetailedById(lectureId)
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        SlideDeckDetailResponse slideDeckDetail = toSlideDeckDetail(lecture.getSlideDeck());

        return LectureDetailResponse.builder()
                .id(lecture.getId())
                .title(lecture.getTitle())
                .description(lecture.getDescription())
                .status(lecture.getStatus())
                .createdAt(lecture.getCreatedAt())
                .updatedAt(lecture.getUpdatedAt())
                .slideDeck(slideDeckDetail)
                .build();
    }

    private LectureSummaryResponse toSummaryResponse(LectureEntity lecture) {
        SlideDeckEntity slideDeck = lecture.getSlideDeck();
        SlideDeckSummaryResponse slideDeckSummary = null;

        if (slideDeck != null) {
            slideDeckSummary = SlideDeckSummaryResponse.builder()
                    .id(slideDeck.getId())
                    .gcpAssetId(slideDeck.getGcpAssetId())
                    .originalName(slideDeck.getOriginalName())
                    .pageCount(slideDeck.getPageCount())
                    .uploadStatus(slideDeck.getUploadStatus())
                    .build();
        }

        return LectureSummaryResponse.builder()
                .id(lecture.getId())
                .title(lecture.getTitle())
                .description(lecture.getDescription())
                .status(lecture.getStatus())
                .createdAt(lecture.getCreatedAt())
                .updatedAt(lecture.getUpdatedAt())
                .slideDeck(slideDeckSummary)
                .build();
    }

    private SlideDeckDetailResponse toSlideDeckDetail(SlideDeckEntity slideDeck) {
        if (slideDeck == null) {
            return null;
        }

        List<SlidePageResponse> pages = Optional.ofNullable(slideDeck.getPages())
                .orElseGet(ArrayList::new)
                .stream()
                .sorted((left, right) -> {
                    Integer leftNumber = Optional.ofNullable(left.getPageNumber()).orElse(Integer.MAX_VALUE);
                    Integer rightNumber = Optional.ofNullable(right.getPageNumber()).orElse(Integer.MAX_VALUE);
                    return Integer.compare(leftNumber, rightNumber);
                })
                .map(this::toPageResponse)
                .collect(Collectors.toList());

        return SlideDeckDetailResponse.builder()
                .id(slideDeck.getId())
                .gcpAssetId(slideDeck.getGcpAssetId())
                .originalName(slideDeck.getOriginalName())
                .pageCount(slideDeck.getPageCount())
                .uploadStatus(slideDeck.getUploadStatus())
                .contentSummary(slideDeck.getContentSummary())
                .createdAt(slideDeck.getCreatedAt())
                .signedUrl(buildSignedUrl(slideDeck.getGcpAssetId()))
                .pages(pages)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SlideDeckFileResponse getSlideDeckFile(Long lectureId) {
        LectureEntity lecture = lectureRepository.findDetailedById(lectureId)
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        SlideDeckEntity slideDeck = lecture.getSlideDeck();
        if (slideDeck == null || !StringUtils.hasText(slideDeck.getGcpAssetId())) {
            throw new AppException(ErrorCode.INVALID_FILE_UPLOAD, "Slide deck is not available.");
        }

        String bucket = Optional.ofNullable(storageProperties.getStorage())
                .map(GcpStorageProperties.StorageProperties::getBucket)
                .orElse(null);

        if (!StringUtils.hasText(bucket)) {
            log.warn("GCP bucket is not configured; cannot stream slide deck.");
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Storage bucket is not configured.");
        }

        try {
            Blob blob = storage.get(BlobId.of(bucket, slideDeck.getGcpAssetId()));
            if (blob == null) {
                throw new AppException(ErrorCode.INVALID_FILE_UPLOAD, "Slide deck file was not found in storage.");
            }

            byte[] content = blob.getContent();
            String fileName = Optional.ofNullable(slideDeck.getOriginalName()).orElse("slides.pdf");
            String contentType = Optional.ofNullable(blob.getContentType()).orElse("application/pdf");

            return SlideDeckFileResponse.builder()
                    .content(content)
                    .fileName(fileName)
                    .contentType(contentType)
                    .build();
        } catch (StorageException ex) {
            log.error("Failed to download slide deck {} from bucket {}: {}", slideDeck.getGcpAssetId(), bucket, ex.getMessage());
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to download slide deck from storage.", ex);
        }
    }

    private SlidePageResponse toPageResponse(SlidePageEntity page) {
        return SlidePageResponse.builder()
                .pageNumber(page.getPageNumber())
                .title(page.getTitle())
                .contentSummary(page.getContentSummary())
                .allText(page.getAllText())
                .headings(new ArrayList<>(Optional.ofNullable(page.getHeadings()).orElseGet(List::of)))
                .bullets(new ArrayList<>(Optional.ofNullable(page.getBullets()).orElseGet(List::of)))
                .body(new ArrayList<>(Optional.ofNullable(page.getBody()).orElseGet(List::of)))
                .keywords(new ArrayList<>(Optional.ofNullable(page.getKeywords()).orElseGet(List::of)))
                .build();
    }

    private String buildSignedUrl(String objectName) {
        if (!StringUtils.hasText(objectName)) {
            return null;
        }

        String bucket = Optional.ofNullable(storageProperties.getStorage())
                .map(GcpStorageProperties.StorageProperties::getBucket)
                .orElse(null);

        if (!StringUtils.hasText(bucket)) {
            log.debug("GCP bucket is not configured; skipping signed URL generation");
            return null;
        }

        try {
            BlobInfo blobInfo = BlobInfo.newBuilder(bucket, objectName).build();
            URL signedUrl = storage.signUrl(
                    blobInfo,
                    SIGNED_URL_DURATION_MINUTES,
                    TimeUnit.MINUTES,
                    Storage.SignUrlOption.withV4Signature());
            return signedUrl.toString();
        } catch (StorageException ex) {
            log.warn("Failed to generate signed URL for object {}: {}", objectName, ex.getMessage());
            return null;
        }
    }
}


