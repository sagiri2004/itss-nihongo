package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.entity.AssetStatus;
import com.itss_nihongo.backend.entity.LectureEntity;
import com.itss_nihongo.backend.repository.LectureRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SlideProcessingNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final LectureRepository lectureRepository;

    public SlideProcessingNotificationService(SimpMessagingTemplate messagingTemplate,
                                            NotificationService notificationService,
                                            LectureRepository lectureRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.lectureRepository = lectureRepository;
    }

    @Transactional
    public void notifySlideProcessingComplete(Long lectureId, Long slideDeckId, AssetStatus status) {
        LectureEntity lecture = lectureRepository.findById(lectureId).orElse(null);
        
        String title = status == AssetStatus.READY 
                ? "Slide processing completed" 
                : "Slide processing failed";
        String message = status == AssetStatus.READY 
                ? "Your slide deck has been processed successfully. You can now start recording." 
                : "Slide processing failed. Please try uploading again.";
        
        // Create notification in database
        if (lecture != null && lecture.getUser() != null) {
            notificationService.createNotification(
                    lecture.getUser().getId(),
                    lectureId,
                    title,
                    message
            );
        }
        
        // Send WebSocket notification
        SlideProcessingNotification notification = new SlideProcessingNotification(
                lectureId,
                slideDeckId,
                status.name(),
                message
        );
        
        messagingTemplate.convertAndSend("/topic/slide-processing/" + lectureId, notification);
    }

    public record SlideProcessingNotification(
            Long lectureId,
            Long slideDeckId,
            String status,
            String message
    ) {}
}

