package com.ttam.cs.feature.inquiry.domain;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.ttam.cs.common.util.UuidUtils;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;

@Slf4j
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
@Entity
@Table(name = "customer_inquiries")
@Access(AccessType.FIELD)
public class CustomerInquiry {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "unique_key", nullable = false, unique = true)
    private UUID uniqueKey;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "channel", nullable = false, length = 50)
    private String channel;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp;

    @Column(name = "user_code")
    private String userCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "channel_metadata", columnDefinition = "jsonb")
    private ChannelMetadata channelMetadata;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "device_info", columnDefinition = "jsonb")
    private DeviceInfo deviceInfo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "image_urls", columnDefinition = "jsonb")
    private List<String> imageUrls;

    @Column(name = "is_manual", nullable = false)
    private boolean isManual;

    public enum Status {
        OPEN, IN_PROGRESS, RESOLVED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public static UUID nextId() {
        return UuidUtils.generateUuidV7();
    }

    public static CustomerInquiry create(InquiryUniqueKeyGenerator keyGenerator,
            String channel, OffsetDateTime timestamp, String userCode,
            ChannelMetadata channelMetadata, DeviceInfo deviceInfo,
            String content, List<String> imageUrls, boolean isManual) {

        OffsetDateTime now = OffsetDateTime.now(java.time.ZoneOffset.UTC);
        UUID generatedUniqueKey = keyGenerator.generateUniqueKey(channel,
                timestamp, userCode, channelMetadata, content);

        return CustomerInquiry.builder().id(nextId())
                .uniqueKey(generatedUniqueKey)
                .channel(requireText(channel, "channel"))
                .timestamp(timestamp != null ? timestamp : now)
                .userCode(userCode).channelMetadata(channelMetadata)
                .deviceInfo(deviceInfo).status(Status.OPEN)
                .content(content != null ? content : "")
                .imageUrls(imageUrls != null ? imageUrls : List.of())
                .isManual(isManual)
                .build();
    }

    public static CustomerInquiry create(InquiryUniqueKeyGenerator keyGenerator,
            String channel, OffsetDateTime timestamp, String userCode,
            ChannelMetadata channelMetadata, DeviceInfo deviceInfo,
            String content, boolean isManual) {
        return create(keyGenerator, channel, timestamp, userCode, channelMetadata, deviceInfo, content, List.of(), isManual);
    }

    public static CustomerInquiry create(InquiryUniqueKeyGenerator keyGenerator,
            String channel, String rawTimestamp, String userCode,
            ChannelMetadata channelMetadata, DeviceInfo deviceInfo,
            String content, List<String> imageUrls, boolean isManual) {
        return create(keyGenerator, channel, parseTimestamp(rawTimestamp),
                userCode, channelMetadata, deviceInfo, content, imageUrls, isManual);
    }

    public static CustomerInquiry create(InquiryUniqueKeyGenerator keyGenerator,
            String channel, String rawTimestamp, String userCode,
            ChannelMetadata channelMetadata, DeviceInfo deviceInfo,
            String content, boolean isManual) {
        return create(keyGenerator, channel, parseTimestamp(rawTimestamp),
                userCode, channelMetadata, deviceInfo, content, List.of(), isManual);
    }

    private static OffsetDateTime parseTimestamp(String rawTimestamp) {
        if (rawTimestamp == null || rawTimestamp.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(rawTimestamp.trim());
        } catch (Exception e) {
            log.warn("⚠️ Failed to parse timestamp '{}', using null",
                    rawTimestamp);
            return null;
        }
    }

    public static CustomerInquiry reconstitute(UUID id, UUID uniqueKey,
            String channel, OffsetDateTime timestamp, String userCode,
            ChannelMetadata channelMetadata, DeviceInfo deviceInfo,
            String content, Status status, List<String> imageUrls, boolean isManual) {

        return CustomerInquiry.builder()
                .id(Objects.requireNonNull(id, "id must not be null"))
                .uniqueKey(Objects.requireNonNull(uniqueKey,
                        "uniqueKey must not be null"))
                .channel(requireText(channel, "channel")).timestamp(timestamp)
                .userCode(userCode).channelMetadata(channelMetadata)
                .deviceInfo(deviceInfo)
                .status(status != null ? status : Status.OPEN)
                .content(content != null ? content : "")
                .imageUrls(imageUrls != null ? imageUrls : List.of())
                .isManual(isManual)
                .build();
    }

    public static CustomerInquiry reconstitute(UUID id, UUID uniqueKey,
            String channel, OffsetDateTime timestamp, String userCode,
            ChannelMetadata channelMetadata, DeviceInfo deviceInfo,
            String content, Status status, boolean isManual) {
        return reconstitute(id, uniqueKey, channel, timestamp, userCode, channelMetadata, deviceInfo, content, status, List.of(), isManual);
    }

    public void markInProgress(OffsetDateTime at) {
        this.status = Status.IN_PROGRESS;
        this.updatedAt = Objects.requireNonNull(at, "at");
    }

    public void resolve(OffsetDateTime at) {
        this.status = Status.RESOLVED;
        this.updatedAt = Objects.requireNonNull(at, "at");
    }

    public void updateStatus(Status status, OffsetDateTime at) {
        this.status = Objects.requireNonNull(status, "status");
        this.updatedAt = Objects.requireNonNull(at, "at");
    }

    public void updateChannel(String channel) {
        this.channel = requireText(channel, "channel");
    }

    public void updateUserCode(String userCode) {
        this.userCode = userCode;
    }

    public void updateDeviceInfo(DeviceInfo deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public void updateContent(String content) {
        this.content = content != null ? content : "";
    }

    public void updateImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls != null ? imageUrls : List.of();
    }

    public void updateParentId(UUID parentId) {
        this.parentId = parentId;
    }

    public void updateTimestamp(OffsetDateTime updatedAt) {
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    private static String requireText(String value, String name) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
