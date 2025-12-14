package com.itss_nihongo.backend.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itss_nihongo.backend.dto.request.SaveRecordingAnalysisRequest;
import com.itss_nihongo.backend.dto.response.RecordingAnalysisResponse;
import com.itss_nihongo.backend.entity.SlideRecordingAnalysisEntity;
import com.itss_nihongo.backend.entity.SlideRecordingEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.SlideRecordingAnalysisRepository;
import com.itss_nihongo.backend.repository.SlideRecordingRepository;
import com.itss_nihongo.backend.service.SlideRecordingAnalysisService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SlideRecordingAnalysisServiceImpl implements SlideRecordingAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(SlideRecordingAnalysisServiceImpl.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final SlideRecordingAnalysisRepository analysisRepository;
    private final SlideRecordingRepository recordingRepository;

    public SlideRecordingAnalysisServiceImpl(
            SlideRecordingAnalysisRepository analysisRepository,
            SlideRecordingRepository recordingRepository) {
        this.analysisRepository = analysisRepository;
        this.recordingRepository = recordingRepository;
    }

    @Override
    public RecordingAnalysisResponse saveAnalysis(SaveRecordingAnalysisRequest request) {
        SlideRecordingEntity recording = recordingRepository.findById(request.recordingId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        // Xóa analysis cũ nếu có
        analysisRepository.findByRecordingId(request.recordingId())
                .ifPresent(analysisRepository::delete);

        // Tạo analysis mới
        SlideRecordingAnalysisEntity analysis = SlideRecordingAnalysisEntity.builder()
                .recording(recording)
                .contextAccuracy(request.contextAccuracy())
                .contentCompleteness(request.contentCompleteness())
                .contextRelevance(request.contextRelevance())
                .averageSpeechRate(request.averageSpeechRate())
                .feedback(request.feedback())
                .suggestions(serializeSuggestions(request.suggestions()))
                .build();

        SlideRecordingAnalysisEntity saved = analysisRepository.save(analysis);
        log.info("Saved analysis {} for recording {}", saved.getId(), request.recordingId());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RecordingAnalysisResponse getAnalysis(Long recordingId) {
        SlideRecordingAnalysisEntity analysis = analysisRepository
                .findByRecordingId(recordingId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        return toResponse(analysis);
    }

    private RecordingAnalysisResponse toResponse(SlideRecordingAnalysisEntity entity) {
        return RecordingAnalysisResponse.builder()
                .id(entity.getId())
                .recordingId(entity.getRecording().getId())
                .contextAccuracy(entity.getContextAccuracy())
                .contentCompleteness(entity.getContentCompleteness())
                .contextRelevance(entity.getContextRelevance())
                .averageSpeechRate(entity.getAverageSpeechRate())
                .feedback(entity.getFeedback())
                .suggestions(deserializeSuggestions(entity.getSuggestions()))
                .analyzedAt(entity.getAnalyzedAt())
                .build();
    }

    private String serializeSuggestions(List<String> suggestions) {
        if (suggestions == null || suggestions.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(suggestions);
        } catch (Exception e) {
            log.warn("Failed to serialize suggestions", e);
            return "[]";
        }
    }

    private List<String> deserializeSuggestions(String suggestionsJson) {
        if (suggestionsJson == null || suggestionsJson.trim().isEmpty()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(suggestionsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize suggestions", e);
            return List.of();
        }
    }
}

