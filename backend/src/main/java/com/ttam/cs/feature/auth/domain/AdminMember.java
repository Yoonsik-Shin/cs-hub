package com.ttam.cs.feature.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * DB에 저장되는 관리자 및 운영자의 마스터 정보 엔티티입니다.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "admin_member")
public class AdminMember {

    @Id
    @Column(name = "username", nullable = false, length = 50)
    private String username;

    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "role", nullable = false, length = 20)
    private String role; // ADMIN, OPERATOR

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false)
    private OffsetDateTime updatedAt;

    public AdminMember(String username, String nickname, String email, String role) {
        this.username = Objects.requireNonNull(username, "username").trim();
        this.nickname = Objects.requireNonNull(nickname, "nickname").trim();
        this.email = email != null ? email.trim() : null;
        this.role = Objects.requireNonNull(role, "role").trim();
    }

    public void update(String nickname, String email, String role) {
        this.nickname = Objects.requireNonNull(nickname, "nickname").trim();
        this.email = email != null ? email.trim() : null;
        this.role = Objects.requireNonNull(role, "role").trim();
        this.updatedAt = OffsetDateTime.now();
    }
}
