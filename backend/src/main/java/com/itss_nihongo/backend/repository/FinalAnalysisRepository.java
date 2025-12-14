package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.FinalAnalysisEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FinalAnalysisRepository extends JpaRepository<FinalAnalysisEntity, Long> {
    
    Optional<FinalAnalysisEntity> findByLectureId(Long lectureId);
}

