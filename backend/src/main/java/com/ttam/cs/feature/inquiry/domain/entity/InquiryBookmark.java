package com.ttam.cs.feature.inquiry.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@Entity
@Table(name = "inquiry_bookmark", uniqueConstraints = {
        @UniqueConstraint(name = "uq_operator_inquiry", columnNames = {"operator_id", "inquiry_id"})
})
public class InquiryBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operator_id", nullable = false, length = 50)
    private String operatorId;

    @Column(name = "inquiry_id", nullable = false)
    private UUID inquiryId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static InquiryBookmark create(String operatorId, UUID inquiryId) {
        return InquiryBookmark.builder()
                .operatorId(operatorId)
                .inquiryId(inquiryId)
                .build();
    }
}
