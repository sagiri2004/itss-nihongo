package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.request.CreateLectureRequest;
import com.itss_nihongo.backend.dto.response.LectureDetailResponse;
import com.itss_nihongo.backend.dto.response.LectureResponse;
import com.itss_nihongo.backend.dto.response.LectureSummaryResponse;
import com.itss_nihongo.backend.dto.response.SlideDeckFileResponse;
import com.itss_nihongo.backend.service.LectureService;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

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

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<LectureSummaryResponse>> listLectures(
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "status", required = false) com.itss_nihongo.backend.entity.LectureStatus status,
            Principal principal) {
        if (principal != null) {
            return ResponseEntity.ok(lectureService.getLecturesByUser(principal.getName(), limit, status));
        }
        return ResponseEntity.ok(lectureService.getLectures(limit));
    }

    @GetMapping("/{lectureId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<LectureDetailResponse> getLecture(@PathVariable Long lectureId) {
        return ResponseEntity.ok(lectureService.getLecture(lectureId));
    }

    @DeleteMapping("/{lectureId}")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<Void> deleteLecture(@PathVariable Long lectureId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        lectureService.deleteLecture(principal.getName(), lectureId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{lectureId}/slide-deck/file")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<ByteArrayResource> downloadSlideDeck(@PathVariable Long lectureId) {
        SlideDeckFileResponse file = lectureService.getSlideDeckFile(lectureId);
        ByteArrayResource resource = new ByteArrayResource(file.getContent());

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.getContentType());
        } catch (IllegalArgumentException ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        String sanitizedFileName = sanitizeFileName(file.getFileName());
        ContentDisposition contentDisposition = ContentDisposition.inline()
                .filename(sanitizedFileName, StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .contentLength(file.getContent().length)
                .body(resource);
    }

    private String sanitizeFileName(String fileName) {
        String sanitized = StringUtils.hasText(fileName) ? fileName : "slides.pdf";
        sanitized = sanitized.replaceAll("[\\r\\n\\\\\"]", "_").trim();
        if (!StringUtils.hasText(sanitized)) {
            sanitized = "slides.pdf";
        }
        return sanitized;
    }
}


