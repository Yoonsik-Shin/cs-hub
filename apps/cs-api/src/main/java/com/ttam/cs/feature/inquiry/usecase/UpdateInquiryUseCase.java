package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryRequest;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.domain.service.InquiryPolicy;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class UpdateInquiryUseCase {

    private final UpdateInquiryStatusUseCase updateInquiryStatusUseCase;
    private final UpdateInquiryFieldsUseCase updateInquiryFieldsUseCase;

    @Transactional
    public void execute(UUID inquiryId, UpdateInquiryRequest request, String ipAddress) {
        if (request.status() != null) {
            String statusReason = InquiryPolicy.requireStatusReason(
                    request.reasons() != null ? request.reasons().get("status") : null);
            updateInquiryStatusUseCase.execute(inquiryId, new UpdateInquiryStatusRequest(
                    request.operatorInfo(),
                    request.status(),
                    statusReason));
        }

        if (hasFieldChanges(request)) {
            updateInquiryFieldsUseCase.execute(inquiryId, new UpdateInquiryFieldsRequest(
                    request.operatorInfo(),
                    request.channel(),
                    request.userCode(),
                    request.deviceInfo(),
                    request.content(),
                    request.imageUrls(),
                    request.customFields(),
                    request.reasons()), ipAddress);
        }
    }

    private boolean hasFieldChanges(UpdateInquiryRequest request) {
        return request.channel() != null
                || request.userCode() != null
                || request.deviceInfo() != null
                || request.content() != null
                || request.imageUrls() != null
                || request.customFields() != null;
    }
}
