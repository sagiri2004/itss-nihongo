package com.itss_nihongo.backend.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SlidePageResponse {
    Integer pageNumber;
    String title;
    String contentSummary;
    String allText;
    List<String> headings;
    List<String> bullets;
    List<String> body;
    List<String> keywords;
}


