package com.itss_nihongo.backend.controller;

import com.itss_nihongo.backend.dto.response.NotificationResponse;
import com.itss_nihongo.backend.service.NotificationService;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasRole('USER')")
public class NotificationController {

    private final NotificationService notificationService;
    private final com.itss_nihongo.backend.service.UserService userService;

    public NotificationController(NotificationService notificationService,
                                  com.itss_nihongo.backend.service.UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(Principal principal) {
        Long userId = userService.findByUsername(principal.getName())
                .map(u -> u.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<NotificationResponse> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Principal principal) {
        Long userId = userService.findByUsername(principal.getName())
                .map(u -> u.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long notificationId, Principal principal) {
        Long userId = userService.findByUsername(principal.getName())
                .map(u -> u.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        notificationService.markAsRead(notificationId, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Principal principal) {
        Long userId = userService.findByUsername(principal.getName())
                .map(u -> u.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }
}

