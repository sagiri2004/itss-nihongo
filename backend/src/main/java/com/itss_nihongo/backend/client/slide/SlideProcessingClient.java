package com.itss_nihongo.backend.client.slide;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final SlideProcessingProperties properties;

    public SlideProcessingClient(RestTemplate slideProcessingRestTemplate,
                                 SlideProcessingProperties properties) {
        this.restTemplate = slideProcessingRestTemplate;
        this.properties = properties;
    }

    public boolean isConfigured() {
        return properties.getBaseUrl() != null && !properties.getBaseUrl().isBlank();
    }

    public Optional<SlideProcessingResponsePayload> processSlides(Long lectureId,
                                                                  String gcsUri,
                                                                  String originalName) {
        if (!isConfigured()) {
            log.warn("Slide processing base URL is not configured. Skipping processing.");
            return Optional.empty();
        }

        SlideProcessingRequestPayload payload = new SlideProcessingRequestPayload(lectureId, gcsUri, originalName);
        if (log.isDebugEnabled()) {
            try {
                String payloadJson = OBJECT_MAPPER.writeValueAsString(payload);
                log.debug("Calling slide processing with payload: {}", payloadJson);
            } catch (JsonProcessingException ex) {
                log.debug("Calling slide processing with payload (failed to serialize): {}", payload, ex);
            }
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<SlideProcessingRequestPayload> entity = new HttpEntity<>(payload, headers);

        String baseUrl = properties.getBaseUrl().endsWith("/")
                ? properties.getBaseUrl()
                : properties.getBaseUrl() + "/";
        String endpoint = baseUrl + "slides/process";

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

