package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.ttam.cs.feature.inquiry.domain.DeviceInfo;
import com.ttam.cs.feature.inquiry.domain.OperatorInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record UpdateInquiryFieldsRequest(
    @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
    String channel,
    String userCode,
    DeviceInfo deviceInfo,
    String content,
    Map<String, String> reasons
) {}
