package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.CreateTranscriptionRecordRequest;
import com.itss_nihongo.backend.dto.response.TranscriptionRecordResponse;

public interface TranscriptionService {

    TranscriptionRecordResponse saveTranscription(CreateTranscriptionRecordRequest request);
}


