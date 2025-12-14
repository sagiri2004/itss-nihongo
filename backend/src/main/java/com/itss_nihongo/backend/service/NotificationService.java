package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.response.NotificationResponse;
import java.util.List;

public interface NotificationService {
    List<NotificationResponse> getUserNotifications(Long userId);
    long getUnreadCount(Long userId);
    void markAsRead(Long notificationId, Long userId);
    void markAllAsRead(Long userId);
    NotificationResponse createNotification(Long userId, Long lectureId, String title, String message);
}

