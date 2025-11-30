package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.LectureEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureRepository extends JpaRepository<LectureEntity, Long> {

    @EntityGraph(attributePaths = {"slideDeck", "slideDeck.pages"})
    Optional<LectureEntity> findDetailedById(Long id);
}


