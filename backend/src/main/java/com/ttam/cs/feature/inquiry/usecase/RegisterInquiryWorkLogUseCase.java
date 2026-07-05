package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class RegisterInquiryWorkLogUseCase {

    private final CustomerInquiryRepository repository;
    private final InquiryWorkLogRepository workLogRepository;

    @Transactional
    public UUID execute(UUID inquiryId, RegisterWorkLogRequest request) {
        var inquiry = repository.findById(inquiryId)
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
                inquiry.getStatus());

        workLogRepository.save(workLog);
        return workLog.getId();
    }
}
