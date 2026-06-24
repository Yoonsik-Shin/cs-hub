package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.common.dto.CursorPage;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CustomerInquiryRepositoryCustom {
    CursorPage<CustomerInquiry> searchInquiries(String channel, String userCode,
            CustomerInquiry.Status status, String contentKeyword,
            OffsetDateTime startDateTime, OffsetDateTime endDateTime,
            UUID cursor, int size);

    void bulkInsert(List<CustomerInquiry> inquiries);
}
