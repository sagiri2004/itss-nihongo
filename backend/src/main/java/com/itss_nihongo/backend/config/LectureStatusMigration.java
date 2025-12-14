package com.itss_nihongo.backend.config;

import com.itss_nihongo.backend.entity.LectureStatus;
import com.itss_nihongo.backend.repository.LectureRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1) // Run after DataSeeder
public class LectureStatusMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LectureStatusMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public LectureStatusMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            // Check if migration is needed by trying to query for old status values
            // If the column is still enum with old values, we need to migrate
            
            // Step 1: Try to convert enum column to VARCHAR temporarily
            // This will fail if column is already VARCHAR or doesn't exist, which is fine
            try {
                jdbcTemplate.execute("ALTER TABLE lectures MODIFY COLUMN status VARCHAR(50)");
                log.info("Converted status column from enum to VARCHAR for migration");
            } catch (Exception e) {
                // Column might already be VARCHAR or migration already done
                String errorMsg = e.getMessage();
                if (errorMsg != null && errorMsg.contains("Unknown column")) {
                    log.warn("Status column does not exist yet, skipping migration");
                    return;
                }
                log.debug("Status column might already be VARCHAR or migration not needed: {}", e.getMessage());
            }

            // Step 2: Migrate old status values to new ones
            // Migrate DRAFT -> INFO_INPUT
            int draftCount = jdbcTemplate.update(
                    "UPDATE lectures SET status = ? WHERE status = ?",
                    LectureStatus.INFO_INPUT.name(),
                    "DRAFT"
            );
            if (draftCount > 0) {
                log.info("Migrated {} lectures from DRAFT to INFO_INPUT", draftCount);
            }

            // Migrate PROCESSING -> SLIDE_UPLOAD (if any)
            int processingCount = jdbcTemplate.update(
                    "UPDATE lectures SET status = ? WHERE status = ?",
                    LectureStatus.SLIDE_UPLOAD.name(),
                    "PROCESSING"
            );
            if (processingCount > 0) {
                log.info("Migrated {} lectures from PROCESSING to SLIDE_UPLOAD", processingCount);
            }

            // Migrate PUBLISHED -> COMPLETED (if any)
            int publishedCount = jdbcTemplate.update(
                    "UPDATE lectures SET status = ? WHERE status = ?",
                    LectureStatus.COMPLETED.name(),
                    "PUBLISHED"
            );
            if (publishedCount > 0) {
                log.info("Migrated {} lectures from PUBLISHED to COMPLETED", publishedCount);
            }

            // Migrate UPLOADED -> SLIDE_UPLOAD (if any)
            int uploadedCount = jdbcTemplate.update(
                    "UPDATE lectures SET status = ? WHERE status = ?",
                    LectureStatus.SLIDE_UPLOAD.name(),
                    "UPLOADED"
            );
            if (uploadedCount > 0) {
                log.info("Migrated {} lectures from UPLOADED to SLIDE_UPLOAD", uploadedCount);
            }

            // Migrate READY -> SLIDE_UPLOAD (if any)
            int readyCount = jdbcTemplate.update(
                    "UPDATE lectures SET status = ? WHERE status = ?",
                    LectureStatus.SLIDE_UPLOAD.name(),
                    "READY"
            );
            if (readyCount > 0) {
                log.info("Migrated {} lectures from READY to SLIDE_UPLOAD", readyCount);
            }

            // Migrate FAILED -> INFO_INPUT (if any, treat as needs to restart)
            int failedCount = jdbcTemplate.update(
                    "UPDATE lectures SET status = ? WHERE status = ?",
                    LectureStatus.INFO_INPUT.name(),
                    "FAILED"
            );
            if (failedCount > 0) {
                log.info("Migrated {} lectures from FAILED to INFO_INPUT", failedCount);
            }

            // Step 3: Convert back to enum with new values
            // This will be handled by Hibernate on next schema update, but we can do it here too
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE lectures MODIFY COLUMN status ENUM('INFO_INPUT', 'SLIDE_UPLOAD', 'RECORDING', 'COMPLETED') NOT NULL"
                );
                log.info("Converted status column back to enum with new values");
            } catch (Exception e) {
                // Hibernate will handle this on schema update, or column might already be enum
                log.debug("Enum conversion will be handled by Hibernate: {}", e.getMessage());
            }

        } catch (Exception e) {
            log.error("Error during lecture status migration. Please run the SQL migration script manually: {}", e.getMessage());
            log.error("See: src/main/resources/migration/lecture_status_migration.sql");
        }
    }
}

