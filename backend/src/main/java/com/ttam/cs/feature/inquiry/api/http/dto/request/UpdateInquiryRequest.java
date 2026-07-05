package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

public record UpdateInquiryRequest(
    @NotNull(message = "작업자 정보는 필수입니다.") @Valid OperatorInfo operatorInfo,
    CustomerInquiry.Status status,
    String channel,
    String userCode,
    DeviceInfo deviceInfo,
    String content,
    List<String> imageUrls,
    Map<String, String> reasons
) {}

