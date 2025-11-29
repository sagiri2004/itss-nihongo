package com.itss_nihongo.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gcp")
public class GcpStorageProperties {

    private String projectId;
    private String credentialsPath;
    private final StorageProperties storage = new StorageProperties();

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getCredentialsPath() {
        return credentialsPath;
    }

    public void setCredentialsPath(String credentialsPath) {
        this.credentialsPath = credentialsPath;
    }

    public StorageProperties getStorage() {
        return storage;
    }

    public static class StorageProperties {
        private String bucket;
        private String region;
        private Integer lifecycleDays;
        private String slidesFolder = "slides";

        public String getBucket() {
            return bucket;
        }

        public void setBucket(String bucket) {
            this.bucket = bucket;
        }

        public String getSlidesFolder() {
            return slidesFolder;
        }

        public void setSlidesFolder(String slidesFolder) {
            this.slidesFolder = slidesFolder;
        }

        public String getRegion() {
            return region;
        }

        public void setRegion(String region) {
            this.region = region;
        }

        public Integer getLifecycleDays() {
            return lifecycleDays;
        }

        public void setLifecycleDays(Integer lifecycleDays) {
            this.lifecycleDays = lifecycleDays;
        }
    }
}


