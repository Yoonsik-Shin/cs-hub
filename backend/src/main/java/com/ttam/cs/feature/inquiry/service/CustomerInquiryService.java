package com.ttam.cs.feature.inquiry.service;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.feature.inquiry.api.http.dto.request.CreateInquiryRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.DataIntegrationPayload;
import com.ttam.cs.feature.inquiry.api.http.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.response.InquiryWorkLogResponse;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.common.dto.CursorPage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerInquiryService {

    private final CustomerInquiryRepository repository;
    private final InquiryWorkLogRepository workLogRepository;
    private final InquiryUniqueKeyGenerator uniqueKeyGenerator;

    @Transactional
    public void integrateInquiries(String channel, List<DataIntegrationPayload.IntegrationItem> items) {
        List<CustomerInquiry> inquiries = items.stream()
                .map(item -> CustomerInquiry.create(
                        uniqueKeyGenerator,
                        channel,
                        item.timestamp(),
                        item.userCode(),
                        item.channelMetadata(),
                        item.deviceInfo(),
                        item.content()))
                .toList();

        repository.bulkInsert(inquiries);
    }

    @Transactional(readOnly = true)
    public CursorPage<CustomerInquiry> search(
            String channel,
            String userCode,
            CustomerInquiry.Status status,
            String keyword,
            OffsetDateTime start,
            OffsetDateTime end,
            UUID cursor,
            int size) {
        return repository.searchInquiries(channel, userCode, status, keyword, start, end, cursor, size);
    }

    @Transactional
    public UUID create(CreateInquiryRequest request) {
        CustomerInquiry inquiry = CustomerInquiry.create(
                uniqueKeyGenerator,
                request.channel(),
                request.timestamp(),
                request.userCode(),
                request.channelMetadata(),
                request.deviceInfo(),
                request.content());
        repository.save(inquiry);
        return inquiry.getId();
    }

    @Transactional
    public UUID addWorkLog(UUID inquiryId, RegisterWorkLogRequest request) {
        CustomerInquiry inquiry = repository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다."));

        String answer = request.answer();
        String memo = request.memo();

        boolean hasAnswer = answer != null && !answer.trim().isEmpty();
        boolean hasMemo = memo != null && !memo.trim().isEmpty();

        if (!hasAnswer && !hasMemo) {
            throw new IllegalArgumentException("답변 또는 메모 내용은 필수입니다.");
        }

        InquiryWorkLog.ActionType actionType;
        if (hasAnswer && hasMemo) {
            actionType = InquiryWorkLog.ActionType.ANSWER_AND_MEMO_SUBMITTED;
        } else if (hasAnswer) {
            actionType = InquiryWorkLog.ActionType.ANSWER_SUBMITTED;
        } else {
            actionType = InquiryWorkLog.ActionType.MEMO_ADDED;
        }

        InquiryWorkLog workLog = InquiryWorkLog.create(
                inquiryId,
                actionType,
                answer,
                memo,
                request.operatorInfo(),
                inquiry.getStatus(),
                inquiry.getStatus()
        );

        workLogRepository.save(workLog);
        return workLog.getId();
    }

    @Transactional
    public void updateStatus(UUID inquiryId, UpdateInquiryStatusRequest request) {
        CustomerInquiry inquiry = repository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다."));

        CustomerInquiry.Status previousStatus = inquiry.getStatus();
        CustomerInquiry.Status newStatus = request.status();

        if (previousStatus == newStatus) {
            return;
        }

        inquiry.updateStatus(newStatus, OffsetDateTime.now(ZoneOffset.UTC));
        repository.save(inquiry);

        InquiryWorkLog workLog = InquiryWorkLog.create(
                inquiryId,
                InquiryWorkLog.ActionType.STATUS_CHANGED,
                null,
                null,
                request.operatorInfo(),
                previousStatus,
                newStatus
        );

        workLogRepository.save(workLog);
    }

    @Transactional(readOnly = true)
    public List<InquiryWorkLogResponse> getWorkLogs(UUID inquiryId) {
        return workLogRepository.findByInquiryIdOrderByCreatedAtDesc(inquiryId).stream()
                .map(InquiryWorkLogResponse::new)
                .toList();
    }
}
