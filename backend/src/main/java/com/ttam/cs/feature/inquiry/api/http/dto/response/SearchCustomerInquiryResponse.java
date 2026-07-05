package com.ttam.cs.feature.inquiry.api.http.dto.response;

import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SearchCustomerInquiryResponse(
        List<Content> content,
        UUID nextCursor,
        boolean hasNext
) {

    public static SearchCustomerInquiryResponse of(CursorPage<CustomerInquiry> page, String s3UrlPrefix) {
        List<Content> mappedContent = page.content().stream()
                .map(entity -> new Content(entity, s3UrlPrefix, 0))
                .toList();
        return new SearchCustomerInquiryResponse(
                mappedContent,
                page.nextCursor(),
                page.hasNext()
        );
    }

    public static SearchCustomerInquiryResponse of(CursorPage<CustomerInquiry> page, String s3UrlPrefix, java.util.Map<UUID, Long> replyCounts) {
        List<Content> mappedContent = page.content().stream()
                .map(entity -> new Content(entity, s3UrlPrefix, replyCounts.getOrDefault(entity.getId(), 0L).intValue()))
                .toList();
        return new SearchCustomerInquiryResponse(
                mappedContent,
                page.nextCursor(),
                page.hasNext()
        );
    }

    public static SearchCustomerInquiryResponse of(CursorPage<CustomerInquiry> page) {
        return of(page, "");
    }

    public record Content(
            UUID id,
            UUID uniqueKey,
            UUID parentId,
            Integer replyCount,
            String channel,
            OffsetDateTime timestamp,
            String userCode,
            ChannelMetadata channelMetadata,
            DeviceInfo deviceInfo,
            String status,
            String content,
            List<String> imageUrls,
            boolean isManual,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        public Content(CustomerInquiry entity, String s3UrlPrefix) {
            this(entity, s3UrlPrefix, 0);
        }

        public Content(CustomerInquiry entity, String s3UrlPrefix, Integer replyCount) {
            this(
                    entity.getId(),
                    entity.getUniqueKey(),
                    entity.getParentId(),
                    replyCount,
                    entity.getChannel(),
                    entity.getTimestamp(),
                    entity.getUserCode(),
                    entity.getChannelMetadata(),
                    entity.getDeviceInfo(),
                    entity.getStatus().name(),
                    entity.getContent(),
                    entity.getImageUrls() == null ? null : entity.getImageUrls().stream()
                            .map(url -> {
                                if (url == null) return null;
                                if (url.startsWith("http://") || url.startsWith("https://")) {
                                    return url; // Legacy absolute URL
                                }
                                return s3UrlPrefix.endsWith("/") ? s3UrlPrefix + url : s3UrlPrefix + "/" + url;
                            })
                            .toList(),
                    entity.isManual(),
                    entity.getCreatedAt(),
                    entity.getUpdatedAt()
            );
        }

        public Content(CustomerInquiry entity) {
            this(entity, "");
        }
    }
}
