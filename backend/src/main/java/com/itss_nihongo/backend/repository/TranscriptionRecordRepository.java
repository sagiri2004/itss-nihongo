package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.TranscriptionRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TranscriptionRecordRepository extends JpaRepository<TranscriptionRecordEntity, Long> {
}


