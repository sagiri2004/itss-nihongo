package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.CreateLectureRequest;
import com.itss_nihongo.backend.dto.response.LectureResponse;

public interface LectureService {

    LectureResponse createLecture(String username, CreateLectureRequest request);
}


