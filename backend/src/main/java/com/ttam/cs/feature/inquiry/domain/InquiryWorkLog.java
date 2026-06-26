package com.ttam.cs.feature.inquiry.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.ttam.cs.common.util.UuidUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
@Entity
@Table(name = "inquiry_work_logs")
@Access(AccessType.FIELD)
public class InquiryWorkLog {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "inquiry_id", nullable = false)
    private UUID inquiryId;

    public enum ActionType {
        ANSWER_SUBMITTED,
        MEMO_ADDED,
        ANSWER_AND_MEMO_SUBMITTED,
        STATUS_CHANGED,
        FIELD_MODIFIED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 50)
    private ActionType actionType;

    @Column(name = "answer", columnDefinition = "text")
    private String answer;

    @Column(name = "memo", columnDefinition = "text")
    private String memo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "operator_info", nullable = false, columnDefinition = "jsonb")
    private OperatorInfo operatorInfo;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private CustomerInquiry.Status previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_status", length = 20)
    private CustomerInquiry.Status currentStatus;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "modification_details", columnDefinition = "jsonb")
    private List<FieldModification> modificationDetails;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static UUID nextId() {
        return UuidUtils.generateUuidV7();
    }

    public static InquiryWorkLog create(UUID inquiryId, ActionType actionType, String answer, String memo,
                                         OperatorInfo operatorInfo, CustomerInquiry.Status previousStatus,
                                         CustomerInquiry.Status currentStatus) {
        return InquiryWorkLog.builder()
                .id(nextId())
                .inquiryId(inquiryId)
                .actionType(actionType)
                .answer(answer)
                .memo(memo)
                .operatorInfo(operatorInfo)
                .previousStatus(previousStatus)
                .currentStatus(currentStatus)
                .build();
    }

    public static InquiryWorkLog createForModification(UUID inquiryId, OperatorInfo operatorInfo,
                                                       String ipAddress, List<FieldModification> modifications) {
        return InquiryWorkLog.builder()
                .id(nextId())
                .inquiryId(inquiryId)
                .actionType(ActionType.FIELD_MODIFIED)
                .operatorInfo(operatorInfo)
                .ipAddress(ipAddress)
                .modificationDetails(modifications)
                .build();
    }
}
