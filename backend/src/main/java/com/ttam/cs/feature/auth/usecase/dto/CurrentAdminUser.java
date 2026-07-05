package com.ttam.cs.feature.auth.usecase.dto;

/**
 * Nginx Basic Auth로 인증된 관리자 계정 정보.
 * admin_member DB 테이블의 계정 정보와 대응됩니다.
 */
public record CurrentAdminUser(
        String id,
        String nickname,
        String email,
        String role) {

    /** X-Remote-User 헤더가 없거나 매핑되지 않을 때 사용하는 Fallback */
    public static CurrentAdminUser unknown(String rawUsername) {
        String name = (rawUsername != null && !rawUsername.isBlank()) ? rawUsername : "unknown";
        return new CurrentAdminUser(name, name, "", "OPERATOR");
    }
}
