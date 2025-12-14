package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.dto.response.NotificationResponse;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.entity.NotificationEntity;
import com.itss_nihongo.backend.entity.UserEntity;
import com.itss_nihongo.backend.exception.AppException;
import com.itss_nihongo.backend.exception.ErrorCode;
import com.itss_nihongo.backend.repository.LectureRepository;
import com.itss_nihongo.backend.repository.NotificationRepository;
import com.itss_nihongo.backend.repository.UserRepository;
import com.itss_nihongo.backend.service.NotificationService;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final LectureRepository lectureRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                  UserRepository userRepository,
                                  LectureRepository lectureRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.lectureRepository = lectureRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public void markAsRead(Long notificationId, Long userId) {
        NotificationEntity notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Notification not found"));
        
        if (!notification.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(Long userId) {
        List<NotificationEntity> unreadNotifications = notificationRepository
                .findByUserIdAndIsReadOrderByCreatedAtDesc(userId, false);
        
        unreadNotifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    @Override
    public NotificationResponse createNotification(Long userId, Long lectureId, String title, String message) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        LectureEntity lecture = null;
        if (lectureId != null) {
            lecture = lectureRepository.findById(lectureId)
                    .orElse(null); // Lecture might be deleted, allow null
        }
        
        NotificationEntity notification = NotificationEntity.builder()
                .user(user)
                .lecture(lecture)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        
        NotificationEntity saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    private NotificationResponse toResponse(NotificationEntity entity) {
        return NotificationResponse.builder()
                .id(entity.getId())
                .lectureId(entity.getLecture() != null ? entity.getLecture().getId() : null)
                .lectureTitle(entity.getLecture() != null ? entity.getLecture().getTitle() : null)
                .title(entity.getTitle())
                .message(entity.getMessage())
                .isRead(entity.getIsRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

