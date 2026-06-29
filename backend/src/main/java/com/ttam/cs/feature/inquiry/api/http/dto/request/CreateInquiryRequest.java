package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.ttam.cs.feature.inquiry.domain.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.DeviceInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.util.List;

public record CreateInquiryRequest(
        @NotBlank(message = "채널 정보는 필수입니다.") String channel,
        OffsetDateTime timestamp,
        String userCode,
        @Valid ChannelMetadata channelMetadata,
        @Valid DeviceInfo deviceInfo,
        @NotBlank(message = "문의 내용은 필수입니다.") String content,
        List<String> imageUrls
) {
}
