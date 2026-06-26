package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.common.dto.CursorPage;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CustomerInquiryRepositoryCustom {
    CursorPage<CustomerInquiry> searchInquiries(List<String> channels, String userCode,
            List<CustomerInquiry.Status> statuses, String contentKeyword,
            OffsetDateTime startDateTime, OffsetDateTime endDateTime,
            UUID cursor, int size);

    long countInquiries(List<String> channels, String userCode,
            List<CustomerInquiry.Status> statuses, String contentKeyword,
            OffsetDateTime startDateTime, OffsetDateTime endDateTime,
            int limit);

    void bulkInsert(List<CustomerInquiry> inquiries);
}
