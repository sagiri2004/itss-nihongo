package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.request.CreateTranscriptionRecordRequest;
import com.itss_nihongo.backend.dto.response.TranscriptionRecordResponse;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.TranscriptionRecordEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.TranscriptionRecordRepository;
import com.itss_nihongo.backend.service.TranscriptionService;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

@Service
@Transactional
public class TranscriptionServiceImpl implements TranscriptionService {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionServiceImpl.class);

    private final LectureRepository lectureRepository;
    private final TranscriptionRecordRepository transcriptionRecordRepository;

    public TranscriptionServiceImpl(LectureRepository lectureRepository,
                                    TranscriptionRecordRepository transcriptionRecordRepository) {
        this.lectureRepository = lectureRepository;
        this.transcriptionRecordRepository = transcriptionRecordRepository;
    }

    @Override
    public TranscriptionRecordResponse saveTranscription(CreateTranscriptionRecordRequest request) {
        LectureEntity lecture = lectureRepository.findById(request.lectureId())
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        TranscriptionRecordEntity entity = TranscriptionRecordEntity.builder()
                .lecture(lecture)
                .sessionId(request.sessionId())
                .presentationId(request.presentationId())
                .transcriptText(request.text())
                .confidence(sanitizeDecimal(request.confidence()))
                .eventTimestamp(sanitizeDecimal(request.timestamp()))
                .finalResult(request.isFinal())
                .slideNumber(request.slideNumber())
                .slideScore(sanitizeDecimal(request.slideScore()))
                .slideConfidence(sanitizeDecimal(request.slideConfidence()))
                .matchedKeywords(normalizeKeywords(request.matchedKeywords()))
                .build();

        TranscriptionRecordEntity saved = transcriptionRecordRepository.save(entity);
        log.debug("Saved transcription record {} for lecture {}", saved.getId(), lecture.getId());

        return TranscriptionRecordResponse.builder()
                .id(saved.getId())
                .lectureId(saved.getLecture().getId())
                .sessionId(saved.getSessionId())
                .presentationId(saved.getPresentationId())
                .text(saved.getTranscriptText())
                .confidence(saved.getConfidence())
                .timestamp(saved.getEventTimestamp())
                .isFinal(saved.isFinalResult())
                .slideNumber(saved.getSlideNumber())
                .slideScore(saved.getSlideScore())
                .slideConfidence(saved.getSlideConfidence())
                .matchedKeywords(saved.getMatchedKeywords())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    private BigDecimal sanitizeDecimal(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.stripTrailingZeros();
    }

    private List<String> normalizeKeywords(List<String> keywords) {
        if (CollectionUtils.isEmpty(keywords)) {
            return List.of();
        }
        return keywords.stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .map(String::trim)
                .toList();
    }
}


