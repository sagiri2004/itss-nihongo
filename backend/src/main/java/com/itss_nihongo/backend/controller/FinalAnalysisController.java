package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.response.FinalAnalysisResponse;
import com.itss_nihongo.backend.service.FinalAnalysisService;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lectures")
public class FinalAnalysisController {

    private final FinalAnalysisService finalAnalysisService;

    public FinalAnalysisController(FinalAnalysisService finalAnalysisService) {
        this.finalAnalysisService = finalAnalysisService;
    }

    @PostMapping("/{lectureId}/final-analysis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FinalAnalysisResponse> performFinalAnalysis(
            @PathVariable Long lectureId,
            Principal principal) {
        FinalAnalysisResponse response = finalAnalysisService.analyzeLecture(lectureId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{lectureId}/final-analysis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FinalAnalysisResponse> getFinalAnalysis(
            @PathVariable Long lectureId,
            Principal principal) {
        FinalAnalysisResponse response = finalAnalysisService.getFinalAnalysis(lectureId);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{lectureId}/final-analysis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteFinalAnalysis(
            @PathVariable Long lectureId,
            Principal principal) {
        finalAnalysisService.deleteFinalAnalysis(lectureId);
        return ResponseEntity.noContent().build();
    }
}

