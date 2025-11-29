package com.itss_nihongo.backend.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    USERNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "username_already_exists"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "user_not_found"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "invalid_credentials"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "unauthorized"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "access_denied"),
    LECTURE_NOT_FOUND(HttpStatus.NOT_FOUND, "lecture_not_found"),
    INVALID_FILE_UPLOAD(HttpStatus.BAD_REQUEST, "invalid_file_upload"),
    SLIDE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "slide_upload_failed"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error");

    private final HttpStatus status;
    private final String messageKey;

    ErrorCode(HttpStatus status, String messageKey) {
        this.status = status;
        this.messageKey = messageKey;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessageKey() {
        return messageKey;
    }
}

