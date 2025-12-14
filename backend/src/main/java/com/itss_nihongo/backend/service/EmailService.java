package com.itss_nihongo.backend.service;

public interface EmailService {

    void sendPasswordResetEmail(String email, String resetToken, String resetUrl);
}

