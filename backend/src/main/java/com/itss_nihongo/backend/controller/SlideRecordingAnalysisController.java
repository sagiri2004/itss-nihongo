package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.request.SaveRecordingAnalysisRequest;
import com.itss_nihongo.backend.dto.response.RecordingAnalysisResponse;
import com.itss_nihongo.backend.service.SlideRecordingAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recording-analyses")
public class SlideRecordingAnalysisController {

    private final SlideRecordingAnalysisService analysisService;

    public SlideRecordingAnalysisController(SlideRecordingAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<RecordingAnalysisResponse> saveAnalysis(
            @Valid @RequestBody SaveRecordingAnalysisRequest request) {
        RecordingAnalysisResponse response = analysisService.saveAnalysis(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/recording/{recordingId}")
    public ResponseEntity<RecordingAnalysisResponse> getAnalysis(@PathVariable Long recordingId) {
        RecordingAnalysisResponse response = analysisService.getAnalysis(recordingId);
        return ResponseEntity.ok(response);
    }
}

