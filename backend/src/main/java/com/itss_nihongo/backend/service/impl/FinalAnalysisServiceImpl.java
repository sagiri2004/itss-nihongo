package com.itss_nihongo.backend.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.CollectionType;
import com.itss_nihongo.backend.dto.request.FinalAnalysisRequest;
import com.itss_nihongo.backend.entity.FinalAnalysisEntity;
import com.itss_nihongo.backend.entity.FinalAnalysisSlideEntity;
import com.itss_nihongo.backend.repository.FinalAnalysisRepository;
import com.itss_nihongo.backend.dto.response.FinalAnalysisResponse;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.LectureStatus;
import com.itss_nihongo.backend.entity.SlideDeckEntity;
import com.itss_nihongo.backend.entity.SlideRecordingEntity;
import com.itss_nihongo.backend.entity.SlideRecordingMessageEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideRecordingRepository;
import com.itss_nihongo.backend.service.FinalAnalysisService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.itss_nihongo.backend.config.SlideProcessingProperties;
import com.itss_nihongo.backend.config.GcpStorageProperties;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import java.net.URL;
import java.util.concurrent.TimeUnit;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
@Transactional
public class FinalAnalysisServiceImpl implements FinalAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(FinalAnalysisServiceImpl.class);

    private static final long SIGNED_URL_DURATION_MINUTES = 30;

    private final LectureRepository lectureRepository;
    private final SlideRecordingRepository slideRecordingRepository;
    private final FinalAnalysisRepository finalAnalysisRepository;
    private final RestTemplate restTemplate;
    private final SlideProcessingProperties slideProcessingProperties;
    private final ObjectMapper objectMapper;
    private final Storage storage;
    private final GcpStorageProperties storageProperties;

    public FinalAnalysisServiceImpl(
            LectureRepository lectureRepository,
            SlideRecordingRepository slideRecordingRepository,
            FinalAnalysisRepository finalAnalysisRepository,
            RestTemplate slideProcessingRestTemplate,
            SlideProcessingProperties slideProcessingProperties,
            Storage storage,
            GcpStorageProperties storageProperties) {
        this.lectureRepository = lectureRepository;
        this.slideRecordingRepository = slideRecordingRepository;
        this.finalAnalysisRepository = finalAnalysisRepository;
        this.restTemplate = slideProcessingRestTemplate;
        this.slideProcessingProperties = slideProcessingProperties;
        this.storage = storage;
        this.storageProperties = storageProperties;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public FinalAnalysisResponse analyzeLecture(Long lectureId) {
        LectureEntity lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        // Kiểm tra status phải là ANALYZING hoặc COMPLETED (cho phép phân tích lại)
        if (lecture.getStatus() != LectureStatus.ANALYZING && lecture.getStatus() != LectureStatus.COMPLETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST, 
                "Lecture must be in ANALYZING or COMPLETED status to perform final analysis");
        }

        SlideDeckEntity slideDeck = lecture.getSlideDeck();
        if (slideDeck == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Lecture must have slide deck");
        }

        // Lấy global summary
        String globalSummary = slideDeck.getAllSummary() != null 
            ? slideDeck.getAllSummary() 
            : slideDeck.getContentSummary();

        // Lấy tất cả recordings cho lecture này
        List<SlideRecordingEntity> recordings = slideRecordingRepository.findAll()
                .stream()
                .filter(r -> r.getLecture().getId().equals(lectureId))
                .sorted(Comparator.comparing(SlideRecordingEntity::getSlidePageNumber, 
                    Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        if (recordings.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, 
                "No recordings found for this lecture");
        }

        // Tạo slide transcripts
        List<FinalAnalysisRequest.SlideTranscript> slideTranscripts = new ArrayList<>();
        for (SlideRecordingEntity recording : recordings) {
            // Join tất cả messages thành một text
            String transcriptText = recording.getMessages().stream()
                    .sorted(Comparator.comparing(SlideRecordingMessageEntity::getRelativeTimeSec))
                    .map(SlideRecordingMessageEntity::getText)
                    .collect(Collectors.joining(" "));

            // Lấy slide summary và image URL nếu có
            String slideSummary = null;
            String slideImageUrl = null;
            if (slideDeck.getPages() != null && recording.getSlidePageNumber() != null) {
                final Integer pageNumber = recording.getSlidePageNumber();
                final String gcpAssetId = slideDeck.getGcpAssetId();
                
                // Sử dụng array để có thể thay đổi giá trị trong lambda
                final String[] summaryHolder = new String[1];
                final String[] imageUrlHolder = new String[1];
                
                slideDeck.getPages().stream()
                        .filter(p -> p.getPageNumber() != null 
                            && p.getPageNumber().equals(pageNumber))
                        .findFirst()
                        .ifPresent(page -> {
                            // Lấy summary
                            summaryHolder[0] = page.getSummary() != null 
                                ? page.getSummary() 
                                : page.getContentSummary();
                            
                            // Lấy previewUrl nếu có, hoặc tạo signed URL từ GCP
                            String previewUrl = page.getPreviewUrl();
                            if (previewUrl != null && !previewUrl.isEmpty()) {
                                imageUrlHolder[0] = previewUrl;
                            } else if (gcpAssetId != null && !gcpAssetId.isEmpty()) {
                                // Tạo signed URL cho slide page image từ GCP
                                // Pattern: sử dụng PDF file URL với page number parameter
                                // Hoặc tạo URL cho extracted page image
                                imageUrlHolder[0] = buildSlidePageImageUrl(gcpAssetId, pageNumber);
                            }
                        });
                
                slideSummary = summaryHolder[0];
                slideImageUrl = imageUrlHolder[0];
            }

            slideTranscripts.add(new FinalAnalysisRequest.SlideTranscript(
                    recording.getSlidePageNumber(),
                    transcriptText,
                    slideSummary,
                    slideImageUrl
            ));
        }

        // Tạo request
        FinalAnalysisRequest request = new FinalAnalysisRequest(
                lectureId,
                globalSummary,
                slideTranscripts
        );

        // Log request data
        log.info("=== Final Analysis Request ===");
        log.info("Lecture ID: {}", lectureId);
        log.info("Global Summary length: {}", globalSummary != null ? globalSummary.length() : 0);
        log.info("Number of slide transcripts: {}", slideTranscripts.size());
        for (int i = 0; i < slideTranscripts.size(); i++) {
            FinalAnalysisRequest.SlideTranscript transcript = slideTranscripts.get(i);
            log.info("  Slide {}: page={}, transcript_length={}, summary={}, image_url={}",
                i + 1,
                transcript.getSlidePageNumber(),
                transcript.getTranscriptText() != null ? transcript.getTranscriptText().length() : 0,
                transcript.getSlideSummary() != null ? "present" : "null",
                transcript.getSlideImageUrl() != null ? "present" : "null");
        }
        log.info("==============================");

        try {
            // Gọi FastAPI endpoint
            String baseUrl = slideProcessingProperties.getBaseUrl();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            String endpoint = baseUrl + "/final-analysis/final-analysis";
            
            log.info("Calling FastAPI endpoint: {}", endpoint);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<FinalAnalysisRequest> entity = new HttpEntity<>(request, headers);

            // First, get raw response as String to log it
            ResponseEntity<String> rawResponse = restTemplate.postForEntity(
                    endpoint,
                    entity,
                    String.class
            );
            
            String rawJson = rawResponse.getBody();
            log.info("=== Raw JSON Response from FastAPI ===");
            log.info("Response body: {}", rawJson);
            log.info("=====================================");
            
            // Now deserialize to FinalAnalysisResponse
            FinalAnalysisResponse analysisResponse = null;
            try {
                analysisResponse = objectMapper.readValue(rawJson, FinalAnalysisResponse.class);
            } catch (JsonProcessingException e) {
                log.error("Failed to deserialize response JSON: {}", rawJson, e);
                throw new AppException(ErrorCode.INTERNAL_ERROR,
                    "Failed to parse analysis response: " + e.getMessage(), e);
            }
            
            if (analysisResponse == null) {
                throw new AppException(ErrorCode.INTERNAL_ERROR, 
                    "Failed to get analysis response from FastAPI");
            }

            // Log response for debugging
            log.info("=== Final Analysis Response from FastAPI ===");
            log.info("Overall Score: {}", analysisResponse.getOverallScore());
            log.info("Content Coverage: {}", analysisResponse.getContentCoverage());
            log.info("Structure Quality: {}", analysisResponse.getStructureQuality());
            log.info("Clarity Score: {}", analysisResponse.getClarityScore());
            log.info("Engagement Score: {}", analysisResponse.getEngagementScore());
            log.info("Time Management: {}", analysisResponse.getTimeManagement());
            log.info("Overall Feedback: {}", analysisResponse.getOverallFeedback() != null 
                ? analysisResponse.getOverallFeedback().substring(0, Math.min(100, analysisResponse.getOverallFeedback().length()))
                : "null");
            log.info("Number of slide analyses: {}", 
                analysisResponse.getSlideAnalyses() != null ? analysisResponse.getSlideAnalyses().size() : 0);
            log.info("============================================");

            // Validate response data and set defaults for null values
            if (analysisResponse.getStrengths() == null) {
                analysisResponse.setStrengths(new ArrayList<>());
            }
            if (analysisResponse.getImprovements() == null) {
                analysisResponse.setImprovements(new ArrayList<>());
            }
            if (analysisResponse.getRecommendations() == null) {
                analysisResponse.setRecommendations(new ArrayList<>());
            }
            if (analysisResponse.getSlideAnalyses() == null) {
                analysisResponse.setSlideAnalyses(new ArrayList<>());
            }

            // Validate and set defaults for numeric fields (required, cannot be null)
            if (analysisResponse.getOverallScore() == null) {
                log.warn("overallScore is null, setting to 0.0");
                analysisResponse.setOverallScore(0.0);
            }
            if (analysisResponse.getContentCoverage() == null) {
                log.warn("contentCoverage is null, setting to 0.0");
                analysisResponse.setContentCoverage(0.0);
            }
            if (analysisResponse.getStructureQuality() == null) {
                log.warn("structureQuality is null, setting to 0.0");
                analysisResponse.setStructureQuality(0.0);
            }
            if (analysisResponse.getClarityScore() == null) {
                log.warn("clarityScore is null, setting to 0.0");
                analysisResponse.setClarityScore(0.0);
            }
            if (analysisResponse.getEngagementScore() == null) {
                log.warn("engagementScore is null, setting to 0.0");
                analysisResponse.setEngagementScore(0.0);
            }
            if (analysisResponse.getTimeManagement() == null) {
                log.warn("timeManagement is null, setting to 0.0");
                analysisResponse.setTimeManagement(0.0);
            }
            if (analysisResponse.getOverallFeedback() == null || analysisResponse.getOverallFeedback().trim().isEmpty()) {
                log.warn("overallFeedback is null or empty, setting to default message");
                analysisResponse.setOverallFeedback("分析結果が利用できませんでした。");
            }

            // Lưu kết quả phân tích vào database
            try {
                // Xóa analysis cũ nếu có
                finalAnalysisRepository.findByLectureId(lectureId)
                        .ifPresent(finalAnalysisRepository::delete);

                // Tạo entity mới với validated values
                FinalAnalysisEntity analysisEntity = FinalAnalysisEntity.builder()
                        .lecture(lecture)
                        .overallScore(analysisResponse.getOverallScore())
                        .overallFeedback(analysisResponse.getOverallFeedback())
                        .contentCoverage(analysisResponse.getContentCoverage())
                        .structureQuality(analysisResponse.getStructureQuality())
                        .clarityScore(analysisResponse.getClarityScore())
                        .engagementScore(analysisResponse.getEngagementScore())
                        .timeManagement(analysisResponse.getTimeManagement())
                        .strengths(objectMapper.writeValueAsString(analysisResponse.getStrengths()))
                        .improvements(objectMapper.writeValueAsString(analysisResponse.getImprovements()))
                        .recommendations(objectMapper.writeValueAsString(analysisResponse.getRecommendations()))
                        .build();

                // Tạo slide analyses - chỉ khi có dữ liệu
                List<FinalAnalysisSlideEntity> slideAnalyses = new ArrayList<>();
                if (analysisResponse.getSlideAnalyses() != null && !analysisResponse.getSlideAnalyses().isEmpty()) {
                    slideAnalyses = analysisResponse.getSlideAnalyses().stream()
                            .map(sa -> {
                                try {
                                    return FinalAnalysisSlideEntity.builder()
                                            .finalAnalysis(analysisEntity)
                                            .slidePageNumber(sa.getSlidePageNumber())
                                            .score(sa.getScore())
                                            .feedback(sa.getFeedback())
                                            .strengths(objectMapper.writeValueAsString(
                                                    sa.getStrengths() != null ? sa.getStrengths() : new ArrayList<>()))
                                            .improvements(objectMapper.writeValueAsString(
                                                    sa.getImprovements() != null ? sa.getImprovements() : new ArrayList<>()))
                                            .build();
                                } catch (JsonProcessingException e) {
                                    log.error("Failed to serialize slide analysis data", e);
                                    throw new RuntimeException("Failed to serialize slide analysis data", e);
                                }
                            })
                            .collect(Collectors.toList());
                }

                analysisEntity.setSlideAnalyses(slideAnalyses);
                finalAnalysisRepository.save(analysisEntity);

                // Set ID trong response
                analysisResponse.setId(analysisEntity.getId());
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize analysis data", e);
                // Vẫn trả về response nhưng không lưu vào DB
            }

            // Update lecture status to COMPLETED
            lecture.setStatus(LectureStatus.COMPLETED);
            lectureRepository.save(lecture);

            log.info("Final analysis completed for lecture {}", lectureId);
            return analysisResponse;

        } catch (Exception e) {
            log.error("Failed to call final analysis endpoint", e);
            throw new AppException(ErrorCode.INTERNAL_ERROR, 
                "Failed to perform final analysis: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public FinalAnalysisResponse getFinalAnalysis(Long lectureId) {
        return finalAnalysisRepository.findByLectureId(lectureId)
                .map(this::mapToResponse)
                .orElse(null);
    }

    private FinalAnalysisResponse mapToResponse(FinalAnalysisEntity entity) {
        List<FinalAnalysisResponse.SlideAnalysis> slideAnalyses = entity.getSlideAnalyses().stream()
                .map(sa -> FinalAnalysisResponse.SlideAnalysis.builder()
                        .slidePageNumber(sa.getSlidePageNumber())
                        .score(sa.getScore())
                        .feedback(sa.getFeedback())
                        .strengths(parseJsonList(sa.getStrengths()))
                        .improvements(parseJsonList(sa.getImprovements()))
                        .build())
                .collect(Collectors.toList());

        return FinalAnalysisResponse.builder()
                .id(entity.getId())
                .lectureId(entity.getLecture().getId())
                .overallScore(entity.getOverallScore())
                .overallFeedback(entity.getOverallFeedback())
                .contentCoverage(entity.getContentCoverage())
                .structureQuality(entity.getStructureQuality())
                .clarityScore(entity.getClarityScore())
                .engagementScore(entity.getEngagementScore())
                .timeManagement(entity.getTimeManagement())
                .slideAnalyses(slideAnalyses)
                .strengths(parseJsonList(entity.getStrengths()))
                .improvements(parseJsonList(entity.getImprovements()))
                .recommendations(parseJsonList(entity.getRecommendations()))
                .build();
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.trim().isEmpty()) {
            return List.of();
        }
        try {
            CollectionType listType = objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, String.class);
            return objectMapper.readValue(json, listType);
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse JSON list: {}", json, e);
            return List.of();
        }
    }

    @Override
    public void deleteFinalAnalysis(Long lectureId) {
        LectureEntity lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        // Chỉ cho phép xóa khi status là COMPLETED
        if (lecture.getStatus() != LectureStatus.COMPLETED) {
            throw new AppException(ErrorCode.INVALID_REQUEST,
                "Can only delete final analysis when lecture is in COMPLETED status");
        }

        // Xóa analysis
        finalAnalysisRepository.findByLectureId(lectureId)
                .ifPresent(finalAnalysisRepository::delete);

        // Chuyển status từ COMPLETED về ANALYZING để có thể phân tích lại
        lecture.setStatus(LectureStatus.ANALYZING);
        lectureRepository.save(lecture);

        log.info("Deleted final analysis for lecture {} and set status to ANALYZING", lectureId);
    }

    /**
     * Build signed URL for slide page image from GCP.
     * Tạo URL cho PDF file với page number, hoặc tìm extracted page image.
     * Pattern có thể là:
     * 1. PDF file URL với page parameter: {gcpAssetId}#page={pageNumber}
     * 2. Extracted page image: {slides-folder}/{gcpAssetId}/pages/page_{pageNumber}.png
     * 3. Hoặc sử dụng PDF file signed URL và để FastAPI extract page
     */
    private String buildSlidePageImageUrl(String gcpAssetId, Integer pageNumber) {
        if (!StringUtils.hasText(gcpAssetId) || pageNumber == null) {
            return null;
        }

        String bucket = storageProperties.getStorage() != null 
            ? storageProperties.getStorage().getBucket() 
            : null;

        if (!StringUtils.hasText(bucket)) {
            log.debug("GCP bucket is not configured; skipping slide image URL generation");
            return null;
        }

        String slidesFolder = storageProperties.getStorage() != null
            ? storageProperties.getStorage().getSlidesFolder()
            : "slides";

        // Pattern 1: Extracted page image - {slides-folder}/{gcpAssetId}/pages/page_{pageNumber}.png
        String objectName1 = String.format("%s/%s/pages/page_%d.png", slidesFolder, gcpAssetId, pageNumber);
        // Pattern 2: {slides-folder}/{gcpAssetId}_page_{pageNumber}.png
        String objectName2 = String.format("%s/%s_page_%d.png", slidesFolder, gcpAssetId, pageNumber);
        // Pattern 3: {gcpAssetId}/pages/page_{pageNumber}.png (without slides-folder prefix)
        String objectName3 = String.format("%s/pages/page_%d.png", gcpAssetId, pageNumber);
        // Pattern 4: PDF file itself (FastAPI can extract page from PDF)
        String pdfObjectName = gcpAssetId;

        // Try each pattern until we find one that exists
        for (String objectName : new String[]{objectName1, objectName2, objectName3}) {
            try {
                BlobId blobId = BlobId.of(bucket, objectName);
                Blob blob = storage.get(blobId);
                if (blob != null && blob.exists()) {
                    // Blob exists, generate signed URL
                    BlobInfo blobInfo = BlobInfo.newBuilder(blobId).build();
                    URL signedUrl = storage.signUrl(
                            blobInfo,
                            SIGNED_URL_DURATION_MINUTES,
                            TimeUnit.MINUTES,
                            Storage.SignUrlOption.withV4Signature());
                    log.debug("Generated signed URL for slide page image: {}", objectName);
                    return signedUrl.toString();
                }
            } catch (StorageException ex) {
                log.debug("Slide image not found at {}: {}", objectName, ex.getMessage());
                // Continue to next pattern
            }
        }

        // If no extracted page image found, return PDF file URL with page number
        // FastAPI can extract the page from PDF
        try {
            BlobId pdfBlobId = BlobId.of(bucket, pdfObjectName);
            Blob pdfBlob = storage.get(pdfBlobId);
            if (pdfBlob != null && pdfBlob.exists()) {
                BlobInfo blobInfo = BlobInfo.newBuilder(pdfBlobId).build();
                URL signedUrl = storage.signUrl(
                        blobInfo,
                        SIGNED_URL_DURATION_MINUTES,
                        TimeUnit.MINUTES,
                        Storage.SignUrlOption.withV4Signature());
                // Append page number as parameter for FastAPI to extract
                String urlWithPage = signedUrl.toString() + "#page=" + pageNumber;
                log.debug("Generated signed URL for PDF file with page number: {}", urlWithPage);
                return urlWithPage;
            }
        } catch (StorageException ex) {
            log.warn("PDF file not found at {}: {}", pdfObjectName, ex.getMessage());
        }

        log.warn("Could not find slide image or PDF for gcpAssetId={}, pageNumber={}. Tried patterns: {}, {}, {}, PDF: {}",
            gcpAssetId, pageNumber, objectName1, objectName2, objectName3, pdfObjectName);
        return null;
    }
}

