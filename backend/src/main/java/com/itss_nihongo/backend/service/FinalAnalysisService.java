package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.FinalAnalysisRequest;
import com.itss_nihongo.backend.dto.response.FinalAnalysisResponse;

public interface FinalAnalysisService {
    
    FinalAnalysisResponse analyzeLecture(Long lectureId);
    
    FinalAnalysisResponse getFinalAnalysis(Long lectureId);
    
    void deleteFinalAnalysis(Long lectureId);
}

