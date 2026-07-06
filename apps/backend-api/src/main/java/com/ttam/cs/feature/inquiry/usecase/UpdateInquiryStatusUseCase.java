package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class UpdateInquiryStatusUseCase {

    private final CustomerInquiryRepository repository;
    private final InquiryWorkLogRepository workLogRepository;

    @Transactional
    public void execute(UUID inquiryId, UpdateInquiryStatusRequest request) {
        CustomerInquiry inquiry = repository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다."));

        updateStatus(inquiry, request.status(), request.operatorInfo(), request.reason(), OffsetDateTime.now(ZoneOffset.UTC));
    }

    void execute(UUID inquiryId, CustomerInquiry.Status newStatus, OperatorInfo operatorInfo, String reason, OffsetDateTime at) {
        CustomerInquiry inquiry = repository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다: " + inquiryId));

        updateStatus(inquiry, newStatus, operatorInfo, reason, at);
    }

    private void updateStatus(CustomerInquiry inquiry, CustomerInquiry.Status newStatus, OperatorInfo operatorInfo,
            String reason, OffsetDateTime at) {
        CustomerInquiry.Status previousStatus = inquiry.getStatus();
        if (previousStatus == newStatus) {
            return;
        }

        inquiry.updateStatus(newStatus, at);
        repository.save(inquiry);

        InquiryWorkLog workLog = InquiryWorkLog.create(
                inquiry.getId(),
                InquiryWorkLog.ActionType.STATUS_CHANGED,
                null,
                reason,
                operatorInfo,
                previousStatus,
                newStatus);

        workLogRepository.save(workLog);
    }
}
