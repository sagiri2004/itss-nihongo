package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.response.DashboardSummaryResponse;
import com.itss_nihongo.backend.service.DashboardService;
import com.itss_nihongo.backend.service.LectureService;
import com.itss_nihongo.backend.service.UserService;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.SlideDeckRepository;
import com.itss_nihongo.backend.repository.TranscriptionRecordRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final LectureService lectureService;
    private final LectureRepository lectureRepository;
    private final SlideDeckRepository slideDeckRepository;
    private final TranscriptionRecordRepository transcriptionRecordRepository;
    private final UserService userService;

    public DashboardServiceImpl(LectureService lectureService,
                                LectureRepository lectureRepository,
                                SlideDeckRepository slideDeckRepository,
                                TranscriptionRecordRepository transcriptionRecordRepository,
                                UserService userService) {
        this.lectureService = lectureService;
        this.lectureRepository = lectureRepository;
        this.slideDeckRepository = slideDeckRepository;
        this.transcriptionRecordRepository = transcriptionRecordRepository;
        this.userService = userService;
    }

    @Override
    public DashboardSummaryResponse getSummary(Integer lectureLimit, String username) {
        int limit = (lectureLimit != null && lectureLimit > 0) ? lectureLimit : 5;

        // Get lectures for current user only
        List<com.itss_nihongo.backend.dto.response.LectureSummaryResponse> recentLectures;
        long totalLectures;
        if (username != null) {
            recentLectures = lectureService.getLecturesByUser(username, limit, null);
            totalLectures = lectureRepository.countByUserId(
                    userService.findByUsername(username)
                            .map(com.itss_nihongo.backend.entity.UserEntity::getId)
                            .orElse(0L)
            );
        } else {
            recentLectures = lectureService.getLectures(limit);
            totalLectures = lectureRepository.count();
        }

        return DashboardSummaryResponse.builder()
                .totalLectures(totalLectures)
                .totalSlideDecks(slideDeckRepository.count())
                .totalTranscriptionRecords(transcriptionRecordRepository.count())
                .recentLectures(recentLectures)
                .build();
    }
}


