package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.LectureEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LectureRepository extends JpaRepository<LectureEntity, Long> {

    @EntityGraph(attributePaths = {"slideDeck", "slideDeck.pages"})
    Optional<LectureEntity> findDetailedById(Long id);

    List<LectureEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<LectureEntity> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, com.itss_nihongo.backend.entity.LectureStatus status, Pageable pageable);

    List<LectureEntity> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);
}


