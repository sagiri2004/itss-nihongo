package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.SaveRecordingAnalysisRequest;
import com.itss_nihongo.backend.dto.response.RecordingAnalysisResponse;

public interface SlideRecordingAnalysisService {

    RecordingAnalysisResponse saveAnalysis(SaveRecordingAnalysisRequest request);

    RecordingAnalysisResponse getAnalysis(Long recordingId);
}

