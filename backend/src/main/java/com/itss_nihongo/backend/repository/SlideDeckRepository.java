package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.SlideDeckEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlideDeckRepository extends JpaRepository<SlideDeckEntity, Long> {

    Optional<SlideDeckEntity> findByLectureId(Long lectureId);
}


