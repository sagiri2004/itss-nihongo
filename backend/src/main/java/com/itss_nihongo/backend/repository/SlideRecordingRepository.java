package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.SlideRecordingEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SlideRecordingRepository extends JpaRepository<SlideRecordingEntity, Long> {

    Optional<SlideRecordingEntity> findByLectureIdAndSlidePageNumber(Long lectureId, Integer slidePageNumber);
    
    long countByLectureId(Long lectureId);
}

