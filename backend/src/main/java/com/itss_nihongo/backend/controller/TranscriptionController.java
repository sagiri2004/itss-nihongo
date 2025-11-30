package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.request.CreateTranscriptionRecordRequest;
import com.itss_nihongo.backend.dto.response.TranscriptionRecordResponse;
import com.itss_nihongo.backend.service.TranscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transcriptions")
public class TranscriptionController {

    private final TranscriptionService transcriptionService;

    public TranscriptionController(TranscriptionService transcriptionService) {
        this.transcriptionService = transcriptionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TranscriptionRecordResponse createTranscription(@Valid @RequestBody CreateTranscriptionRecordRequest request) {
        return transcriptionService.saveTranscription(request);
    }
}


