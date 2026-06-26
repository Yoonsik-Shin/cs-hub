package com.ttam.cs.feature.inquiry.api.http.dto.response;

public record InquiryCountResponse(
        long count,
        boolean hasMore
) {
}
