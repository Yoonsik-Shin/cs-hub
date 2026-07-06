package com.ttam.cs.feature.inquiry.api.http.v1.dto.request;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateInquiryStatusRequest(
        @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
        @NotNull(message = "상태 값은 필수입니다.") CustomerInquiry.Status status,
        @NotBlank(message = "상태 변경 사유는 필수입니다.")
        @Size(min = 5, message = "상태 변경 사유는 최소 5자 이상이어야 합니다.")
        String reason
) {}

