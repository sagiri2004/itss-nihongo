package com.itss_nihongo.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.util.StringUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

@Configuration
@EnableConfigurationProperties(GcpStorageProperties.class)
public class GcpStorageConfig {

    @Bean
    public Storage storage(GcpStorageProperties properties) {
        try {
            StorageOptions.Builder builder = StorageOptions.newBuilder();
            if (StringUtils.hasText(properties.getProjectId())) {
                builder.setProjectId(properties.getProjectId());
            }

            GoogleCredentials credentials;
            if (StringUtils.hasText(properties.getCredentialsPath())) {
                credentials = loadCredentials(properties.getCredentialsPath());
            } else {
                credentials = GoogleCredentials.getApplicationDefault();
            }

            builder.setCredentials(credentials);
            return builder.build().getService();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize Google Cloud Storage client", ex);
        }
    }
    private GoogleCredentials loadCredentials(String location) throws IOException {
        if (location.startsWith("classpath:")) {
            String pathWithinClasspath = location.substring("classpath:".length());
            Resource resource = new ClassPathResource(pathWithinClasspath);
            try (InputStream inputStream = resource.getInputStream()) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        Path credentialsPath = Path.of(location);
        try (InputStream inputStream = Files.newInputStream(credentialsPath)) {
            return GoogleCredentials.fromStream(inputStream);
        }
    }
}


