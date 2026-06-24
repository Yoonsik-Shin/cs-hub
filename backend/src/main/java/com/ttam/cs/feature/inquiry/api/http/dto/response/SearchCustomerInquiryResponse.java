package com.ttam.cs.feature.inquiry.api.http.dto.response;

import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.common.dto.CustomCursorPageResponse;
import com.ttam.cs.feature.inquiry.domain.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.DeviceInfo;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SearchCustomerInquiryResponse(
        List<Content> content,
        UUID nextCursor,
        boolean hasNext
) implements CustomCursorPageResponse<SearchCustomerInquiryResponse.Content> {

    public static SearchCustomerInquiryResponse of(CursorPage<CustomerInquiry> page) {
        List<Content> mappedContent = page.content().stream()
                .map(Content::new)
                .toList();
        return new SearchCustomerInquiryResponse(
                mappedContent,
                page.nextCursor(),
                page.hasNext()
        );
    }

    public record Content(
            UUID id,
            UUID uniqueKey,
            String channel,
            OffsetDateTime timestamp,
            String userCode,
            ChannelMetadata channelMetadata,
            DeviceInfo deviceInfo,
            String status,
            String content,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        public Content(CustomerInquiry entity) {
            this(
                    entity.getId(),
                    entity.getUniqueKey(),
                    entity.getChannel(),
                    entity.getTimestamp(),
                    entity.getUserCode(),
                    entity.getChannelMetadata(),
                    entity.getDeviceInfo(),
                    entity.getStatus().name(),
                    entity.getContent(),
                    entity.getCreatedAt(),
                    entity.getUpdatedAt()
            );
        }
    }
}
