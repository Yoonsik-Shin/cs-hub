package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.InquiryBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InquiryBookmarkRepository extends JpaRepository<InquiryBookmark, Long> {
    List<InquiryBookmark> findByOperatorId(String operatorId);
    Optional<InquiryBookmark> findByOperatorIdAndInquiryId(String operatorId, UUID inquiryId);
    boolean existsByOperatorIdAndInquiryId(String operatorId, UUID inquiryId);
    void deleteByOperatorIdAndInquiryId(String operatorId, UUID inquiryId);
}
