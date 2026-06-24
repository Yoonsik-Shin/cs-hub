package com.ttam.cs.feature.inquiry.api.http.dto.response;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.OperatorInfo;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InquiryWorkLogResponse(
        UUID id,
        UUID inquiryId,
        String actionType,
        String answer,
        String memo,
        OperatorInfo operatorInfo,
        CustomerInquiry.Status previousStatus,
        CustomerInquiry.Status currentStatus,
        OffsetDateTime createdAt
) {
    public InquiryWorkLogResponse(InquiryWorkLog entity) {
        this(
                entity.getId(),
                entity.getInquiryId(),
                entity.getActionType().name(),
                entity.getAnswer(),
                entity.getMemo(),
                entity.getOperatorInfo(),
                entity.getPreviousStatus(),
                entity.getCurrentStatus(),
                entity.getCreatedAt()
        );
    }
}
