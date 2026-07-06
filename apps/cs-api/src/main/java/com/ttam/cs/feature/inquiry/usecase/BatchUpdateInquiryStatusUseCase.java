package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.BatchUpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class BatchUpdateInquiryStatusUseCase {
    private static final int MAX_BATCH_UPDATE_COUNT = 100;

    private final CustomerInquiryRepository repository;
    private final UpdateInquiryStatusUseCase updateInquiryStatusUseCase;

    @Transactional
    public void execute(BatchUpdateInquiryStatusRequest request, OperatorInfo operatorInfo, String operatorId) {
        if (request.mode() == BatchUpdateInquiryStatusRequest.TargetMode.IDS) {
            updateStatuses(request.inquiryIds(), request.status(), operatorInfo, request.reason());
            return;
        }

        BatchUpdateInquiryStatusRequest.FilterCriteria filters = request.filters();
        if (filters == null) {
            throw new IllegalArgumentException("검색 결과 전체 선택에는 필터 조건이 필요합니다.");
        }

        List<UUID> ids = repository.findInquiryIds(
                filters.channel(),
                filters.userCode(),
                filters.status(),
                filters.keyword(),
                filters.start(),
                filters.end(),
                filters.isManual(),
                filters.bookmarkedOnly(),
                filters.userCodeMissing(),
                operatorId,
                request.excludedInquiryIds(),
                MAX_BATCH_UPDATE_COUNT);

        if (ids.isEmpty()) {
            throw new IllegalArgumentException("변경할 문의를 선택해 주세요.");
        }

        updateStatuses(ids, request.status(), operatorInfo, request.reason());
    }

    private void updateStatuses(List<UUID> inquiryIds, CustomerInquiry.Status newStatus, OperatorInfo operatorInfo, String reason) {
        if (inquiryIds == null || inquiryIds.isEmpty()) {
            throw new IllegalArgumentException("변경할 문의를 선택해 주세요.");
        }
        if (inquiryIds.size() > MAX_BATCH_UPDATE_COUNT) {
            throw new IllegalArgumentException("한 번에 최대 " + MAX_BATCH_UPDATE_COUNT + "개까지 처리할 수 있습니다.");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (UUID inquiryId : inquiryIds) {
            updateInquiryStatusUseCase.execute(inquiryId, newStatus, operatorInfo, reason, now);
        }
    }
}
