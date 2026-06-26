package com.ttam.cs.infra.config;

import com.ttam.cs.feature.auth.domain.AdminUser;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

/**
 * application.yml의 admin.users 설정을 바인딩합니다.
 *
 * 사용 예시 (application.yml):
 * admin:
 *   users:
 *     runday-cs-admin:
 *       id: runday-cs-admin
 *       nickname: CS 관리자
 *       email: admin@ttam.com
 */
@ConfigurationProperties(prefix = "admin")
@Getter
@Setter
public class AdminUserProperties {

    /** key: htpasswd username, value: 관리자 상세 정보 */
    private Map<String, UserEntry> users = new HashMap<>();

    /**
     * Nginx X-Remote-User 헤더 값을 기반으로 AdminUser를 조회합니다.
     * 미등록 계정이면 Fallback(unknown)을 반환합니다.
     */
    public AdminUser resolve(String remoteUser) {
        if (remoteUser == null || remoteUser.isBlank()) {
            return AdminUser.unknown(null);
        }
        UserEntry entry = users.get(remoteUser.trim());
        if (entry == null) {
            return AdminUser.unknown(remoteUser);
        }
        return new AdminUser(entry.getId(), entry.getNickname(), entry.getEmail());
    }

    @Getter
    @Setter
    public static class UserEntry {
        private String id;
        private String nickname;
        private String email;
    }
}