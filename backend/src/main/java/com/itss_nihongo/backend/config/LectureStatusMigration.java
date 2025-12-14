package com.itss_nihongo.backend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.SQLException;

@Component
@Order(1) // Run early, before other components
public class LectureStatusMigration {

    private static final Logger log = LoggerFactory.getLogger(LectureStatusMigration.class);

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public LectureStatusMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void migrateLectureStatus() {
        try {
            log.info("Checking and migrating lecture status enum...");
            
            // Check current enum values
            String checkSql = "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() " +
                    "AND TABLE_NAME = 'lectures' " +
                    "AND COLUMN_NAME = 'status'";
            
            String columnType = jdbcTemplate.queryForObject(checkSql, String.class);
            log.info("Current status column type: {}", columnType);
            
            if (columnType != null && !columnType.toUpperCase().contains("ANALYZING")) {
                log.info("ANALYZING status not found in enum. Updating...");
                
                try {
                    // Step 1: Convert to VARCHAR temporarily
                    jdbcTemplate.execute("ALTER TABLE lectures MODIFY COLUMN status VARCHAR(50)");
                    log.info("Converted status column to VARCHAR");
                    
                    // Step 2: Convert back to ENUM with ANALYZING
                    jdbcTemplate.execute(
                        "ALTER TABLE lectures MODIFY COLUMN status " +
                        "ENUM('INFO_INPUT', 'SLIDE_UPLOAD', 'RECORDING', 'ANALYZING', 'COMPLETED') NOT NULL"
                    );
                    log.info("Successfully updated status column to include ANALYZING");
                } catch (Exception alterError) {
                    log.error("Failed to alter table. You may need to run migration manually: {}", alterError.getMessage());
                    log.error("Please run: ALTER TABLE lectures MODIFY COLUMN status ENUM('INFO_INPUT', 'SLIDE_UPLOAD', 'RECORDING', 'ANALYZING', 'COMPLETED') NOT NULL");
                }
            } else {
                log.info("ANALYZING status already exists in enum. No migration needed.");
            }
            
        } catch (Exception e) {
            log.error("Unexpected error during lecture status migration: {}", e.getMessage());
            log.error("Please manually run the migration SQL:");
            log.error("ALTER TABLE lectures MODIFY COLUMN status ENUM('INFO_INPUT', 'SLIDE_UPLOAD', 'RECORDING', 'ANALYZING', 'COMPLETED') NOT NULL");
            // Don't throw - allow application to continue
        }
    }
}
