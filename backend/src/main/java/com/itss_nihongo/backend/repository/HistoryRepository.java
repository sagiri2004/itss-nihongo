package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.HistoryEntity;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HistoryRepository extends JpaRepository<HistoryEntity, Long> {

    List<HistoryEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<HistoryEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
}

