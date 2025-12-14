package com.itss_nihongo.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(SlideProcessingProperties.class)
public class SlideProcessingClientConfig {

    @Bean
    public RestTemplate slideProcessingRestTemplate(SlideProcessingProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.resolveConnectTimeoutMs());
        factory.setReadTimeout(properties.resolveReadTimeoutMs());
        return new RestTemplate(factory);
    }
}


