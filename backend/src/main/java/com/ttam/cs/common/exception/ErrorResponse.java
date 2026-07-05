package com.ttam.cs.common.exception;

import java.time.OffsetDateTime;
import java.util.List;

public record ErrorResponse(
        String code,
        String message,
        List<FieldError> fieldErrors,
        OffsetDateTime timestamp
) {
    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(errorCode.name(), errorCode.message(), List.of(), OffsetDateTime.now());
    }

    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, List.of(), OffsetDateTime.now());
    }

    public static ErrorResponse of(String code, String message, List<FieldError> fieldErrors) {
        return new ErrorResponse(code, message, fieldErrors, OffsetDateTime.now());
    }

    public record FieldError(String field, String message) {
    }
}
