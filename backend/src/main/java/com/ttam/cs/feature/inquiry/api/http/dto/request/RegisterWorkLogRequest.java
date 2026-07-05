package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record RegisterWorkLogRequest(
        @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
        String answer,
        String memo
) {}
