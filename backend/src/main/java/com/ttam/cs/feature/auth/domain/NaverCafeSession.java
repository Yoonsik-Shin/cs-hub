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

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "naver_cafe_sessions")
public class NaverCafeSession {

    @Id
    @Column(name = "id", nullable = false, length = 50)
    private String id;

    @Column(name = "encrypted_cookies", nullable = false, columnDefinition = "text")
    private String encryptedCookies;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // ACTIVE, EXPIRED

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "renewal_token")
    private String renewalToken;

    @Column(name = "renewal_token_expires_at")
    private OffsetDateTime renewalTokenExpiresAt;

    public NaverCafeSession(String id, String encryptedCookies, String status, OffsetDateTime updatedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.encryptedCookies = Objects.requireNonNull(encryptedCookies, "encryptedCookies");
        this.status = Objects.requireNonNull(status, "status");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public void update(String encryptedCookies, String status, OffsetDateTime updatedAt) {
        this.encryptedCookies = Objects.requireNonNull(encryptedCookies, "encryptedCookies");
        this.status = Objects.requireNonNull(status, "status");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public void markExpired(OffsetDateTime updatedAt) {
        this.status = "EXPIRED";
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public void generateRenewalToken(String token, OffsetDateTime expiresAt) {
        this.renewalToken = Objects.requireNonNull(token, "token");
        this.renewalTokenExpiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
    }

    public void clearRenewalToken() {
        this.renewalToken = null;
        this.renewalTokenExpiresAt = null;
    }
}
