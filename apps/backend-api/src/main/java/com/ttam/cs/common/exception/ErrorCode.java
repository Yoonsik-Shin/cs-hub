package com.ttam.cs.common.exception;

public enum ErrorCode {
    INVALID_INPUT("잘못된 입력입니다."),
    INQUIRY_NOT_FOUND("존재하지 않는 문의입니다."),
    ENCRYPTION_FAILED("암호화 처리에 실패했습니다."),
    DECRYPTION_FAILED("저장된 인증 세션이 만료되었습니다. 다시 로그인해 주세요."),
    HTPASSWD_IO_ERROR("비밀번호 파일 처리 중 오류가 발생했습니다."),
    STORAGE_ERROR("파일 스토리지 처리에 실패했습니다.");

    private final String message;

    ErrorCode(String message) {
        this.message = message;
    }

    public String message() {
        return message;
    }
}
