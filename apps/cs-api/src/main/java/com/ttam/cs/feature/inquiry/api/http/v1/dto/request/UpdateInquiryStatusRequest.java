package com.ttam.cs.feature.inquiry.api.http.v1.dto.request;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.service.InquiryPolicy;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateInquiryStatusRequest(
        @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
        @NotNull(message = "상태 값은 필수입니다.") CustomerInquiry.Status status,
        @NotBlank(message = "상태 변경 사유는 필수입니다.")
        @Size(min = InquiryPolicy.MIN_STATUS_REASON_LENGTH, message = InquiryPolicy.STATUS_REASON_MESSAGE)
        String reason
) {}
