package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.request.CreateLectureRequest;
import com.itss_nihongo.backend.dto.response.LectureResponse;
import com.itss_nihongo.backend.service.LectureService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lectures")
public class LectureController {

    private final LectureService lectureService;

    public LectureController(LectureService lectureService) {
        this.lectureService = lectureService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<LectureResponse> createLecture(@Valid @RequestBody CreateLectureRequest request,
                                                         Principal principal) {
        LectureResponse response = lectureService.createLecture(principal.getName(), request);
        return ResponseEntity.ok(response);
    }
}


