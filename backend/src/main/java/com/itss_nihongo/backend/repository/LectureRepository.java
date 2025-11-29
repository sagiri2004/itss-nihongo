package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.LectureEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureRepository extends JpaRepository<LectureEntity, Long> {
}


