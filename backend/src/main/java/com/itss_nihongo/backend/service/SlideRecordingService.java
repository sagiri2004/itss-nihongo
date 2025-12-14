package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.SaveSlideRecordingRequest;
import com.itss_nihongo.backend.dto.response.SlideRecordingResponse;
import java.util.Optional;

public interface SlideRecordingService {

    SlideRecordingResponse saveRecording(SaveSlideRecordingRequest request);

    Optional<SlideRecordingResponse> getRecording(Long lectureId, Integer slidePageNumber);
}

