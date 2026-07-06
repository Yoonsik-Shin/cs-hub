package com.ttam.cs.feature.inquiry.api.http.v1.dto.response;

public record InquiryCountResponse(
        long count,
        boolean hasMore
) {
}
