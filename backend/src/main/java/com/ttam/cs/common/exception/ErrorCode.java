package com.ttam.cs.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다."),
    INQUIRY_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 문의입니다."),
    ENCRYPTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "암호화 처리에 실패했습니다."),
    DECRYPTION_FAILED(HttpStatus.GONE, "저장된 인증 세션이 만료되었습니다. 다시 로그인해 주세요."),
    HTPASSWD_IO_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "비밀번호 파일 처리 중 오류가 발생했습니다."),
    STORAGE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "파일 스토리지 처리에 실패했습니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() {
        return status;
    }

    public String message() {
        return message;
    }
}
