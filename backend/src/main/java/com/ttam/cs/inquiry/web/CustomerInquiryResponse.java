package com.ttam.cs.inquiry.web;

import com.ttam.cs.inquiry.domain.CustomerInquiry;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record CustomerInquiryResponse(
        UUID id,
        String source,
        String category,
        String path,
        String userCode,
        Map<String, Object> contactInfo,
        String appVersion,
        Map<String, Object> deviceInfo,
        String status,
        String contents,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public CustomerInquiryResponse(CustomerInquiry entity) {
        this(
                entity.getId(),
                entity.getSource(),
                entity.getCategory(),
                entity.getPath(),
                entity.getUserCode(),
                entity.getContactInfo(),
                entity.getAppVersion(),
                entity.getDeviceInfo(),
                entity.getStatus().name(),
                entity.getContents(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
