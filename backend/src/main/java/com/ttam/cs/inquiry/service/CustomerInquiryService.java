package com.ttam.cs.inquiry.service;

import com.ttam.cs.inquiry.domain.CustomerInquiry;
import com.ttam.cs.inquiry.repo.CustomerInquiryRepository;
import com.ttam.cs.inquiry.web.CustomerInquiryIngestRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerInquiryService {

    private final CustomerInquiryRepository repository;

    @Transactional
    public UUID ingest(CustomerInquiryIngestRequest request) {
        UUID id = request.getId() != null ? request.getId() : UUID.randomUUID();

        String status = StringUtils.hasText(request.getStatus())
                ? request.getStatus()
                : CustomerInquiry.Status.OPEN.name();

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime createdAt = request.getCreatedAt() != null ? request.getCreatedAt() : now;
        OffsetDateTime updatedAt = request.getUpdatedAt() != null ? request.getUpdatedAt() : now;

        CustomerInquiry inquiry = CustomerInquiry.create(
                id,
                request.getSource(),
                request.getCategory(),
                request.getPath(),
                request.getUserCode(),
                request.getContactInfo(),
                request.getAppVersion(),
                request.getDeviceInfo(),
                CustomerInquiry.Status.valueOf(status),
                request.getContents(),
                createdAt,
                updatedAt
        );

        repository.save(inquiry);
        return id;
    }

    @Transactional(readOnly = true)
    public Page<CustomerInquiry> search(
            String source,
            String category,
            CustomerInquiry.Status status,
            String keyword,
            OffsetDateTime start,
            OffsetDateTime end,
            Pageable pageable
    ) {
        return repository.searchInquiries(source, category, status, keyword, start, end, pageable);
    }
}

