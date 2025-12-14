package com.itss_nihongo.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "slide-processing")
public class SlideProcessingProperties {

    private static final int DEFAULT_TIMEOUT_MS = 10000;

    private String baseUrl;

    /**
     * Legacy combined timeout setting. Still supported as a fallback if the more granular
     * connect/read timeouts are not specified.
     */
    private Integer timeoutMs;

    private Integer connectTimeoutMs;
    private Integer readTimeoutMs;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Integer getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(Integer timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    public Integer getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(Integer connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public Integer getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(Integer readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public int resolveConnectTimeoutMs() {
        if (connectTimeoutMs != null && connectTimeoutMs > 0) {
            return connectTimeoutMs;
        }
        return resolveLegacyTimeout();
    }

    public int resolveReadTimeoutMs() {
        if (readTimeoutMs != null && readTimeoutMs > 0) {
            return readTimeoutMs;
        }
        return resolveLegacyTimeout();
    }

    private int resolveLegacyTimeout() {
        if (timeoutMs != null && timeoutMs > 0) {
            return timeoutMs;
        }
        return DEFAULT_TIMEOUT_MS;
    }
}


