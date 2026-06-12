package com.ttam.cs.inquiry.repo;

import com.ttam.cs.inquiry.domain.CustomerInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomerInquiryRepository
        extends JpaRepository<CustomerInquiry, UUID>, CustomerInquiryRepositoryCustom {
}