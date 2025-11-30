package com.itss_nihongo.backend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TranscriptionRecordResponse {
    Long id;
    Long lectureId;
    String sessionId;
    String presentationId;
    String text;
    BigDecimal confidence;
    BigDecimal timestamp;
    boolean isFinal;
    Integer slideNumber;
    BigDecimal slideScore;
    BigDecimal slideConfidence;
    List<String> matchedKeywords;
    Instant createdAt;
}


