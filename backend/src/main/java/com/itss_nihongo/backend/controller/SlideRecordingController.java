package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.request.SaveSlideRecordingRequest;
import com.itss_nihongo.backend.dto.response.SlideRecordingResponse;
import com.itss_nihongo.backend.service.SlideRecordingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slide-recordings")
public class SlideRecordingController {

    private final SlideRecordingService recordingService;

    public SlideRecordingController(SlideRecordingService recordingService) {
        this.recordingService = recordingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<SlideRecordingResponse> saveRecording(
            @Valid @RequestBody SaveSlideRecordingRequest request) {
        SlideRecordingResponse response = recordingService.saveRecording(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<?> getRecording(
            @RequestParam("lecture_id") Long lectureId,
            @RequestParam(value = "slide_page_number", required = false) Integer slidePageNumber) {
        return recordingService.getRecording(lectureId, slidePageNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build()); // Return 200 OK with empty body (frontend will handle as null)
    }
}

