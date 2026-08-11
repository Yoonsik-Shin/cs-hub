package com.ttam.cs.feature.inquiry.api.http.v1.dto.request;

import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record RegisterWorkLogRequest(
        @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
        String answer,
        String memo,
        CustomerInquiry.Status targetStatus,
        String statusReason
) {}
