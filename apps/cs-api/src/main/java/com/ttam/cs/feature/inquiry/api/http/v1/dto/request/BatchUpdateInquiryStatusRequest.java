package com.ttam.cs.feature.inquiry.api.http.v1.dto.request;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record BatchUpdateInquiryStatusRequest(
        @NotNull(message = "선택 대상 모드는 필수입니다.") TargetMode mode,
        List<UUID> inquiryIds,
        FilterCriteria filters,
        List<UUID> excludedInquiryIds,
        @NotNull(message = "변경할 상태는 필수입니다.") CustomerInquiry.Status status,
        @NotBlank(message = "상태 변경 사유는 필수입니다.")
        @Size(min = 5, message = "상태 변경 사유는 최소 5자 이상이어야 합니다.")
        String reason
) {
    public enum TargetMode {
        IDS,
        FILTER
    }

    public record FilterCriteria(
            List<String> channel,
            String userCode,
            List<CustomerInquiry.Status> status,
            OffsetDateTime start,
            OffsetDateTime end,
            Boolean isManual,
            Boolean bookmarkedOnly,
            Boolean userCodeMissing
    ) {}
}
