package com.ttam.cs.feature.inquiry.api.http.v1.dto.request;

import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import com.ttam.cs.feature.inquiry.domain.service.InquiryPolicy;
import java.time.OffsetDateTime;
import java.util.List;

public record CreateInquiryRequest(
        @NotBlank(message = "채널 정보는 필수입니다.") String channel,
        OffsetDateTime timestamp,
        @Pattern(regexp = InquiryPolicy.USER_CODE_PATTERN, message = InquiryPolicy.USER_CODE_MESSAGE) String userCode,
        @Valid ChannelMetadata channelMetadata,
        @Valid DeviceInfo deviceInfo,
        @NotBlank(message = "문의 내용은 필수입니다.") String content,
        List<String> imageUrls
) {
}
