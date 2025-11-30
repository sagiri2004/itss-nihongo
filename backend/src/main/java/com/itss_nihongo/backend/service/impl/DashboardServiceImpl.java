package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.response.DashboardSummaryResponse;
import com.itss_nihongo.backend.service.DashboardService;
import com.itss_nihongo.backend.service.LectureService;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideDeckRepository;
import com.itss_nihongo.backend.repository.TranscriptionRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final LectureService lectureService;
    private final LectureRepository lectureRepository;
    private final SlideDeckRepository slideDeckRepository;
    private final TranscriptionRecordRepository transcriptionRecordRepository;

    public DashboardServiceImpl(LectureService lectureService,
                                LectureRepository lectureRepository,
                                SlideDeckRepository slideDeckRepository,
                                TranscriptionRecordRepository transcriptionRecordRepository) {
        this.lectureService = lectureService;
        this.lectureRepository = lectureRepository;
        this.slideDeckRepository = slideDeckRepository;
        this.transcriptionRecordRepository = transcriptionRecordRepository;
    }

    @Override
    public DashboardSummaryResponse getSummary(Integer lectureLimit) {
        int limit = (lectureLimit != null && lectureLimit > 0) ? lectureLimit : 5;

        return DashboardSummaryResponse.builder()
                .totalLectures(lectureRepository.count())
                .totalSlideDecks(slideDeckRepository.count())
                .totalTranscriptionRecords(transcriptionRecordRepository.count())
                .recentLectures(lectureService.getLectures(limit))
                .build();
    }
}


