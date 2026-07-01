package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record BatchUpdateInquiryStatusRequest(
        @NotNull(message = "선택 대상 모드는 필수입니다.") TargetMode mode,
        List<UUID> inquiryIds,
        FilterCriteria filters,
        List<UUID> excludedInquiryIds,
        @NotNull(message = "변경할 상태는 필수입니다.") CustomerInquiry.Status status
) {
    public enum TargetMode {
        IDS,
        FILTER
    }

    public record FilterCriteria(
            List<String> channel,
            String userCode,
            List<CustomerInquiry.Status> status,
            String keyword,
            OffsetDateTime start,
            OffsetDateTime end,
            Boolean isManual,
            Boolean bookmarkedOnly
    ) {}
}
