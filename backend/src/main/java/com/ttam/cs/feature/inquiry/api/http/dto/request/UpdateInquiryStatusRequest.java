package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.OperatorInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record UpdateInquiryStatusRequest(
        @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
        @NotNull(message = "상태 값은 필수입니다.") CustomerInquiry.Status status
) {}
