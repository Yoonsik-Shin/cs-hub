package com.ttam.cs.feature.auth.domain;

/**
 * Nginx Basic Auth로 인증된 관리자 계정 정보.
 * admin_member DB 테이블의 계정 정보와 대응됩니다.
 */
public record AdminUser(
        String id,
        String nickname,
        String email,
        String role) {

    /** X-Remote-User 헤더가 없거나 매핑되지 않을 때 사용하는 Fallback */
    public static AdminUser unknown(String rawUsername) {
        String name = (rawUsername != null && !rawUsername.isBlank()) ? rawUsername : "unknown";
        return new AdminUser(name, name, "", "OPERATOR");
    }
}
