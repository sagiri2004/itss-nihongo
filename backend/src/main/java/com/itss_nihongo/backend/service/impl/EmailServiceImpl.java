package com.itss_nihongo.backend.service.impl;

import com.itss_nihongo.backend.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${spring.mail.username:noreply@itss-nihongo.com}")
    private String fromEmail;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendPasswordResetEmail(String email, String resetToken, String resetUrl) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("Reset Your Password - ITSS Nihongo");
            
            String fullResetUrl = resetUrl != null ? resetUrl : 
                String.format("%s/reset-password?token=%s", frontendUrl, resetToken);
            
            String emailBody = String.format(
                "Hello,\n\n" +
                "You have requested to reset your password for your ITSS Nihongo account.\n\n" +
                "Please click the following link to reset your password:\n" +
                "%s\n\n" +
                "This link will expire in 1 hour.\n\n" +
                "If you did not request this password reset, please ignore this email.\n\n" +
                "Best regards,\n" +
                "ITSS Nihongo Team",
                fullResetUrl
            );
            
            message.setText(emailBody);
            mailSender.send(message);
            log.info("Password reset email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", email, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }
}

