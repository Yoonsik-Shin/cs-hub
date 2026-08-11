package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ResolvedInquiryReopener {

    private static final String REOPEN_MEMO =
            "[시스템] 회신 메일 유입으로 인해 문의가 다시 오픈되었습니다.";
    private final CustomerInquiryRepository inquiryRepository;
    private final InquiryWorkLogRepository workLogRepository;
    private final Clock clock;
    private final SystemOperatorProvider systemOperatorProvider;

    public void reopen(UUID inquiryId) {
        inquiryRepository.findById(inquiryId).ifPresent(this::reopenIfResolved);
    }

    private void reopenIfResolved(CustomerInquiry inquiry) {
        if (inquiry.getStatus() != CustomerInquiry.Status.RESOLVED) {
            return;
        }

        CustomerInquiry.Status previousStatus = inquiry.getStatus();
        inquiry.updateStatus(CustomerInquiry.Status.OPEN, OffsetDateTime.now(clock));
        inquiryRepository.save(inquiry);

        InquiryWorkLog workLog = InquiryWorkLog.create(
                inquiry.getId(),
                InquiryWorkLog.ActionType.STATUS_CHANGED,
                null,
                REOPEN_MEMO,
                systemOperatorProvider.getOperator(),
                previousStatus,
                CustomerInquiry.Status.OPEN
        );
        workLogRepository.save(workLog);
    }
}
