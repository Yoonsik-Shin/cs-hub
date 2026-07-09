package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class SearchCustomerInquiriesUseCase {

    private final CustomerInquiryRepository repository;

    @Transactional(readOnly = true)
    public CursorPage<CustomerInquiry> execute(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime start,
            OffsetDateTime end,
            Boolean isManual,
            Boolean bookmarkedOnly,
            Boolean userCodeMissing,
            String operatorId,
            UUID cursor,
            int size,
            String sort) {
        return repository.searchInquiries(channels, userCode, statuses, start, end, isManual,
                bookmarkedOnly, userCodeMissing, operatorId, cursor, size, sort);
    }
}
