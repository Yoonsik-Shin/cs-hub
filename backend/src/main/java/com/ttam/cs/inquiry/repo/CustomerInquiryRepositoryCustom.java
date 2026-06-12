package com.ttam.cs.inquiry.repo;

import com.ttam.cs.inquiry.domain.CustomerInquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;

public interface CustomerInquiryRepositoryCustom {
    Page<CustomerInquiry> searchInquiries(
            String source,
            String category,
            CustomerInquiry.Status status,
            String contentKeyword,
            OffsetDateTime startDateTime,
            OffsetDateTime endDateTime,
            Pageable pageable
    );
}
