package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomerInquiryRepository extends
        JpaRepository<CustomerInquiry, UUID>, CustomerInquiryRepositoryCustom {
}