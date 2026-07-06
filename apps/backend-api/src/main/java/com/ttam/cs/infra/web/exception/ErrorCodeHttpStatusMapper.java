package com.ttam.cs.infra.web.exception;

import com.ttam.cs.common.exception.ErrorCode;
import org.springframework.http.HttpStatus;

final class ErrorCodeHttpStatusMapper {
    private ErrorCodeHttpStatusMapper() {
    }

    static HttpStatus toHttpStatus(ErrorCode errorCode) {
        return switch (errorCode) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case INQUIRY_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DECRYPTION_FAILED -> HttpStatus.GONE;
            case ENCRYPTION_FAILED, HTPASSWD_IO_ERROR, STORAGE_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}
