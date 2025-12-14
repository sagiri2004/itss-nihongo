package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.request.SaveSlideRecordingRequest;
import com.itss_nihongo.backend.dto.response.SlideRecordingResponse;
import com.itss_nihongo.backend.entity.HistoryEntity;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.LectureStatus;
import com.itss_nihongo.backend.entity.SlideRecordingEntity;
import com.itss_nihongo.backend.entity.SlideRecordingMessageEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.HistoryRepository;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideRecordingAnalysisRepository;
import com.itss_nihongo.backend.repository.SlideRecordingRepository;
import com.itss_nihongo.backend.service.SlideRecordingService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SlideRecordingServiceImpl implements SlideRecordingService {

    private static final Logger log = LoggerFactory.getLogger(SlideRecordingServiceImpl.class);

    private final LectureRepository lectureRepository;
    private final SlideRecordingRepository recordingRepository;
    private final SlideRecordingAnalysisRepository analysisRepository;
    private final HistoryRepository historyRepository;

    public SlideRecordingServiceImpl(LectureRepository lectureRepository,
                                    SlideRecordingRepository recordingRepository,
                                    SlideRecordingAnalysisRepository analysisRepository,
                                    HistoryRepository historyRepository) {
        this.lectureRepository = lectureRepository;
        this.recordingRepository = recordingRepository;
        this.analysisRepository = analysisRepository;
        this.historyRepository = historyRepository;
    }

    @Override
    public SlideRecordingResponse saveRecording(SaveSlideRecordingRequest request) {
        LectureEntity lecture = lectureRepository.findById(request.lectureId())
                .orElseThrow(() -> new AppException(ErrorCode.LECTURE_NOT_FOUND));

        // Xóa recording cũ nếu có (cho phép ghi đè)
        // Cần xóa analysis trước để tránh foreign key constraint violation
        recordingRepository.findByLectureIdAndSlidePageNumber(
                request.lectureId(), request.slidePageNumber())
                .ifPresent(oldRecording -> {
                    // Xóa analysis liên quan trước
                    analysisRepository.findByRecordingId(oldRecording.getId())
                            .ifPresent(analysisRepository::delete);
                    // Sau đó mới xóa recording
                    recordingRepository.delete(oldRecording);
                    log.info("Deleted old recording {} and its analysis for lecture {} slide {}", 
                            oldRecording.getId(), request.lectureId(), request.slidePageNumber());
                });

        // Tạo recording mới
        SlideRecordingEntity recording = SlideRecordingEntity.builder()
                .lecture(lecture)
                .slidePageNumber(request.slidePageNumber())
                .recordingDurationSec(request.recordingDurationSec())
                .languageCode(request.languageCode())
                .build();

        // Tạo messages
        List<SlideRecordingMessageEntity> messages = request.messages().stream()
                .map(msgDto -> SlideRecordingMessageEntity.builder()
                        .recording(recording)
                        .text(msgDto.text())
                        .relativeTimeSec(msgDto.relativeTimeSec())
                        .timestamp(Instant.ofEpochMilli(msgDto.timestamp()))
                        .build())
                .collect(Collectors.toList());

        recording.setMessages(messages);

        SlideRecordingEntity saved = recordingRepository.save(recording);
        log.info("Saved slide recording {} for lecture {} slide {}", 
                saved.getId(), lecture.getId(), request.slidePageNumber());

        // Update lecture status
        LectureStatus oldStatus = lecture.getStatus();
        boolean isFirstRecording = recordingRepository.countByLectureId(lecture.getId()) == 1;
        
        // Check if all slides have been recorded
        boolean allSlidesRecorded = false;
        if (lecture.getSlideDeck() != null && lecture.getSlideDeck().getPages() != null) {
            int totalSlides = lecture.getSlideDeck().getPages().size();
            long recordedCount = recordingRepository.countByLectureId(lecture.getId());
            allSlidesRecorded = totalSlides > 0 && recordedCount >= totalSlides;
        }

        LectureStatus newStatus;
        if (allSlidesRecorded) {
            newStatus = LectureStatus.COMPLETED;
        } else if (isFirstRecording || oldStatus == LectureStatus.SLIDE_UPLOAD) {
            newStatus = LectureStatus.RECORDING;
        } else {
            newStatus = oldStatus; // Keep current status
        }

        if (newStatus != oldStatus) {
            lecture.setStatus(newStatus);
            lectureRepository.save(lecture);

            // Create history record for status change
            HistoryEntity history = HistoryEntity.builder()
                    .user(lecture.getUser())
                    .lecture(lecture)
                    .action(HistoryEntity.HistoryAction.UPDATED)
                    .description(String.format("Saved recording for slide %d. Status changed from %s to %s", 
                            request.slidePageNumber(), oldStatus, newStatus))
                    .build();
            historyRepository.save(history);
        }

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SlideRecordingResponse> getRecording(Long lectureId, Integer slidePageNumber) {
        if (slidePageNumber == null) {
            // If slidePageNumber is not provided, return empty
            return Optional.empty();
        }
        return recordingRepository
                .findByLectureIdAndSlidePageNumber(lectureId, slidePageNumber)
                .map(this::toResponse);
    }

    private SlideRecordingResponse toResponse(SlideRecordingEntity entity) {
        List<SlideRecordingResponse.MessageResponse> messages = entity.getMessages().stream()
                .map(msg -> SlideRecordingResponse.MessageResponse.builder()
                        .id(msg.getId())
                        .text(msg.getText())
                        .relativeTimeSec(msg.getRelativeTimeSec())
                        .timestamp(msg.getTimestamp())
                        .build())
                .collect(Collectors.toList());

        return SlideRecordingResponse.builder()
                .id(entity.getId())
                .lectureId(entity.getLecture().getId())
                .slidePageNumber(entity.getSlidePageNumber())
                .recordingDurationSec(entity.getRecordingDurationSec())
                .languageCode(entity.getLanguageCode())
                .submittedAt(entity.getSubmittedAt())
                .messages(messages)
                .build();
    }
}

