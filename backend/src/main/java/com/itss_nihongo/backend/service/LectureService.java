package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.CreateLectureRequest;
import com.itss_nihongo.backend.dto.response.LectureDetailResponse;
import com.itss_nihongo.backend.dto.response.LectureResponse;
import com.itss_nihongo.backend.dto.response.LectureSummaryResponse;
import com.itss_nihongo.backend.dto.response.SlideDeckFileResponse;
import java.util.List;

public interface LectureService {

    LectureResponse createLecture(String username, CreateLectureRequest request);

    List<LectureSummaryResponse> getLectures(Integer limit);

    LectureDetailResponse getLecture(Long lectureId);

    SlideDeckFileResponse getSlideDeckFile(Long lectureId);
}


