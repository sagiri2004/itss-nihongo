package com.itss_nihongo.backend.client.slide;

import com.itss_nihongo.backend.config.SlideProcessingProperties;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class SlideProcessingClient {

    private static final Logger log = LoggerFactory.getLogger(SlideProcessingClient.class);

    private final RestTemplate restTemplate;
    private final SlideProcessingProperties properties;

    public SlideProcessingClient(RestTemplate slideProcessingRestTemplate,
                                 SlideProcessingProperties properties) {
        this.restTemplate = slideProcessingRestTemplate;
        this.properties = properties;
    }

    public Optional<SlideProcessingResponsePayload> processSlides(Long lectureId,
                                                                  String gcsUri,
                                                                  String originalName) {
        if (properties.getBaseUrl() == null || properties.getBaseUrl().isBlank()) {
            log.warn("Slide processing base URL is not configured. Skipping processing.");
            return Optional.empty();
        }

        SlideProcessingRequestPayload payload = new SlideProcessingRequestPayload(lectureId, gcsUri, originalName);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<SlideProcessingRequestPayload> entity = new HttpEntity<>(payload, headers);

        String endpoint = properties.getBaseUrl().endsWith("/")
                ? properties.getBaseUrl() + "slides/process"
                : properties.getBaseUrl() + "/slides/process";

        try {
            ResponseEntity<SlideProcessingResponsePayload> response =
                    restTemplate.postForEntity(endpoint, entity, SlideProcessingResponsePayload.class);
            return Optional.ofNullable(response.getBody());
        } catch (RestClientException ex) {
            log.error("Failed to call slide processing service at {}: {}", endpoint, ex.getMessage());
            return Optional.empty();
        }
    }
}


