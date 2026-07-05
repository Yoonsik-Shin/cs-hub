package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InquiryWorkLogRepository extends JpaRepository<InquiryWorkLog, UUID> {
    List<InquiryWorkLog> findByInquiryIdOrderByCreatedAtDesc(UUID inquiryId);
}
