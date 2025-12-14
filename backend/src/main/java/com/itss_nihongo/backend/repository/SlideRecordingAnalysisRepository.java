package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.SlideRecordingAnalysisEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SlideRecordingAnalysisRepository extends JpaRepository<SlideRecordingAnalysisEntity, Long> {

    Optional<SlideRecordingAnalysisEntity> findByRecordingId(Long recordingId);
}

