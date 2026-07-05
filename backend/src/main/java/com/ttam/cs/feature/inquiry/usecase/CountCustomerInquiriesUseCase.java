package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CountCustomerInquiriesUseCase {

    private final CustomerInquiryRepository repository;

    @Transactional(readOnly = true)
    public long execute(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            String keyword,
            OffsetDateTime start,
            OffsetDateTime end,
            Boolean isManual,
            Boolean bookmarkedOnly,
            Boolean userCodeMissing,
            String operatorId,
            int limit) {
        return repository.countInquiries(channels, userCode, statuses, keyword, start, end, isManual,
                bookmarkedOnly, userCodeMissing, operatorId, limit);
    }
}
