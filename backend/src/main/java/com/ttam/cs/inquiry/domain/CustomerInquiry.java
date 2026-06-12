package com.ttam.cs.inquiry.domain;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "customer_inquiries")
@Access(AccessType.FIELD)
public class CustomerInquiry {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "source", nullable = false, length = 50)
    private String source;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @Column(name = "path", nullable = false, length = 255)
    private String path;

    @Column(name = "user_code")
    private String userCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contact_info", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> contactInfo;

    @Column(name = "app_version")
    private String appVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "device_info", columnDefinition = "jsonb")
    private Map<String, Object> deviceInfo;

    public enum Status {
        OPEN, IN_PROGRESS, RESOLVED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @Column(name = "contents", nullable = false, columnDefinition = "text")
    private String contents;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    private CustomerInquiry(
            UUID id,
            String source,
            String category,
            String path,
            String userCode,
            Map<String, Object> contactInfo,
            String appVersion,
            Map<String, Object> deviceInfo,
            Status status,
            String contents,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.source = requireText(source, "source");
        this.category = requireText(category, "category");
        this.path = requireText(path, "path");
        this.userCode = userCode;
        this.contactInfo = Objects.requireNonNull(contactInfo, "contactInfo");
        this.appVersion = appVersion;
        this.deviceInfo = deviceInfo;
        this.status = Objects.requireNonNull(status, "status");
        this.contents = requireText(contents, "contents");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public static CustomerInquiry create(
            UUID id,
            String source,
            String category,
            String path,
            String userCode,
            Map<String, Object> contactInfo,
            String appVersion,
            Map<String, Object> deviceInfo,
            Status status,
            String contents,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
        return new CustomerInquiry(
                id,
                source,
                category,
                path,
                userCode,
                contactInfo,
                appVersion,
                deviceInfo,
                status,
                contents,
                createdAt,
                updatedAt);
    }

    public void markInProgress(OffsetDateTime at) {
        this.status = Status.IN_PROGRESS;
        this.updatedAt = Objects.requireNonNull(at, "at");
    }

    public void resolve(OffsetDateTime at) {
        this.status = Status.RESOLVED;
        this.updatedAt = Objects.requireNonNull(at, "at");
    }

    private static String requireText(String value, String name) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
