package com.ttam.cs.feature.inquiry.service;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.feature.inquiry.api.http.dto.request.CreateInquiryRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.DataIntegrationPayload;
import com.ttam.cs.feature.inquiry.api.http.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.response.InquiryWorkLogResponse;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.feature.inquiry.domain.FieldModification;
import com.ttam.cs.common.dto.CursorPage;
import java.util.ArrayList;
import java.util.Map;
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
                .map(item -> {
                    List<String> imageUrls = item.imageUrls();
                    if ((imageUrls == null || imageUrls.isEmpty()) && item.channelMetadata() instanceof com.ttam.cs.feature.inquiry.domain.NaverCafeMetadata cafeMeta) {
                        imageUrls = cafeMeta.imageUrls();
                    }
                    return CustomerInquiry.create(
                            uniqueKeyGenerator,
                            channel,
                            item.timestamp(),
                            item.userCode(),
                            item.channelMetadata(),
                            item.deviceInfo(),
                            item.content(),
                            imageUrls
                    );
                })
                .toList();

        repository.bulkInsert(inquiries);
    }

    @Transactional(readOnly = true)
    public CursorPage<CustomerInquiry> search(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            String keyword,
            OffsetDateTime start,
            OffsetDateTime end,
            UUID cursor,
            int size) {
        return repository.searchInquiries(channels, userCode, statuses, keyword, start, end, cursor, size);
    }

    @Transactional(readOnly = true)
    public long count(
            List<String> channels,
            String userCode,
            List<CustomerInquiry.Status> statuses,
            String keyword,
            OffsetDateTime start,
            OffsetDateTime end,
            int limit) {
        return repository.countInquiries(channels, userCode, statuses, keyword, start, end, limit);
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

    @Transactional
    public void updateInquiryFields(UUID inquiryId, UpdateInquiryFieldsRequest request, String ipAddress) {
        CustomerInquiry inquiry = repository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문의입니다."));

        List<FieldModification> modifications = new ArrayList<>();
        Map<String, String> reasons = request.reasons() != null ? request.reasons() : Map.of();

        // Check channel
        if (request.channel() != null && !request.channel().equals(inquiry.getChannel())) {
            String reason = reasons.get("channel");
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("channel 수정 사유를 입력해주세요.");
            }
            modifications.add(new FieldModification("channel", inquiry.getChannel(), request.channel(), reason.trim()));
            inquiry.updateChannel(request.channel());
        }

        // Check userCode
        String currentUserCode = inquiry.getUserCode() != null ? inquiry.getUserCode() : "";
        String newUserCode = request.userCode() != null ? request.userCode() : "";
        if (!newUserCode.equals(currentUserCode)) {
            String reason = reasons.get("userCode");
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("userCode 수정 사유를 입력해주세요.");
            }
            modifications.add(new FieldModification("userCode", inquiry.getUserCode(), request.userCode(), reason.trim()));
            inquiry.updateUserCode(request.userCode());
        }

        // Check deviceInfo
        boolean deviceChanged = false;
        if (request.deviceInfo() == null && inquiry.getDeviceInfo() != null) {
            deviceChanged = true;
        } else if (request.deviceInfo() != null && !request.deviceInfo().equals(inquiry.getDeviceInfo())) {
            deviceChanged = true;
        }
        if (deviceChanged) {
            String reason = reasons.get("deviceInfo");
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("deviceInfo 수정 사유를 입력해주세요.");
            }
            String beforeStr = inquiry.getDeviceInfo() != null ? 
                ("appVersion=" + inquiry.getDeviceInfo().appVersion() + 
                 ", model=" + inquiry.getDeviceInfo().model() + 
                 ", osVersion=" + inquiry.getDeviceInfo().osVersion()) : "null";
            String afterStr = request.deviceInfo() != null ? 
                ("appVersion=" + request.deviceInfo().appVersion() + 
                 ", model=" + request.deviceInfo().model() + 
                 ", osVersion=" + request.deviceInfo().osVersion()) : "null";
            modifications.add(new FieldModification("deviceInfo", beforeStr, afterStr, reason.trim()));
            inquiry.updateDeviceInfo(request.deviceInfo());
        }

        // Check content
        if (request.content() != null && !request.content().equals(inquiry.getContent())) {
            String reason = reasons.get("content");
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("content 수정 사유를 입력해주세요.");
            }
            modifications.add(new FieldModification("content", inquiry.getContent(), request.content(), reason.trim()));
            inquiry.updateContent(request.content());
        }

        if (modifications.isEmpty()) {
            return;
        }

        inquiry.updateTimestamp(OffsetDateTime.now(ZoneOffset.UTC));
        repository.save(inquiry);

        InquiryWorkLog workLog = InquiryWorkLog.createForModification(
                inquiryId,
                request.operatorInfo(),
                ipAddress,
                modifications
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
