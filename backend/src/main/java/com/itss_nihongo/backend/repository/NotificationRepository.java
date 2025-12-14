package com.itss_nihongo.backend.repository;

import com.itss_nihongo.backend.entity.NotificationEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<NotificationEntity> findByUserIdAndIsReadOrderByCreatedAtDesc(Long userId, Boolean isRead);
    long countByUserIdAndIsReadFalse(Long userId);
}

