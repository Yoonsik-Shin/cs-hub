package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.common.dto.CursorPage;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CustomerInquiryRepositoryCustom {
    CursorPage<CustomerInquiry> searchInquiries(List<String> channels, String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime startDateTime, OffsetDateTime endDateTime,
            Boolean isManual, Boolean bookmarkedOnly, Boolean userCodeMissing, String operatorId, UUID cursor, int size);

    long countInquiries(List<String> channels, String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime startDateTime, OffsetDateTime endDateTime,
            Boolean isManual, Boolean bookmarkedOnly, Boolean userCodeMissing, String operatorId, int limit);

    List<UUID> findInquiryIds(List<String> channels, String userCode,
            List<CustomerInquiry.Status> statuses,
            OffsetDateTime startDateTime, OffsetDateTime endDateTime,
            Boolean isManual, Boolean bookmarkedOnly, Boolean userCodeMissing, String operatorId,
            List<UUID> excludedIds, int limit);

    void bulkInsert(List<CustomerInquiry> inquiries);
}
