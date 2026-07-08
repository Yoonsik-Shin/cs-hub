package com.ttam.cs.feature.inquiry.repository;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerInquiryRepository extends
        JpaRepository<CustomerInquiry, UUID>, CustomerInquiryRepositoryCustom {

    List<CustomerInquiry> findByParentIdOrderByTimestampAsc(UUID parentId);

    @Query(value = "SELECT * FROM customer_inquiries WHERE channel = 'EMAIL' AND (channel_metadata->'headers'->>'message-id' = :messageId OR channel_metadata->'headers'->>'messageId' = :messageId)", nativeQuery = true)
    Optional<CustomerInquiry> findEmailByMessageId(@Param("messageId") String messageId);

    @Query(value = "SELECT * FROM customer_inquiries " +
            "WHERE channel = 'EMAIL' " +
            "AND email_sender_hash = :senderHash " +
            "AND timestamp >= :since " +
            "ORDER BY timestamp DESC", nativeQuery = true)
    List<CustomerInquiry> findEmailCandidatesBySender(@Param("senderHash") String senderHash, @Param("since") OffsetDateTime since);

    @Query(value = "SELECT parent_id, COUNT(*) FROM customer_inquiries WHERE parent_id IN :parentIds GROUP BY parent_id", nativeQuery = true)
    List<Object[]> countRepliesByParentIds(@Param("parentIds") List<UUID> parentIds);
}