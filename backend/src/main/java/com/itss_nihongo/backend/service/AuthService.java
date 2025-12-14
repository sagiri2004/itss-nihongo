package com.itss_nihongo.backend.service;

import com.itss_nihongo.backend.dto.request.ForgotPasswordRequest;
import com.itss_nihongo.backend.dto.request.LoginRequest;
import com.itss_nihongo.backend.dto.request.RegisterRequest;
import com.itss_nihongo.backend.dto.request.ResetPasswordRequest;
import com.itss_nihongo.backend.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void resetPassword(ResetPasswordRequest request);
}

