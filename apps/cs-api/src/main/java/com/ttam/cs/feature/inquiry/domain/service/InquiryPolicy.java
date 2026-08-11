package com.ttam.cs.feature.inquiry.domain.service;

import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;

public final class InquiryPolicy {

    public static final int USER_CODE_LENGTH = 12;
    public static final int MIN_STATUS_REASON_LENGTH = 5;
    public static final String REQUIRED_USER_CODE_PATTERN = "^[0-9]{12}$";
    public static final String USER_CODE_PATTERN = "^$|" + REQUIRED_USER_CODE_PATTERN;
    public static final String USER_CODE_MESSAGE = "유저 코드는 숫자 12자리여야 합니다.";
    public static final String STATUS_REASON_MESSAGE = "상태 변경 사유는 최소 5자 이상이어야 합니다.";

    public static String requireStatusReason(String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new InvalidInquiryRequestException("상태 변경 사유는 필수입니다.");
        }
        String normalizedReason = reason.trim();
        if (normalizedReason.length() < MIN_STATUS_REASON_LENGTH) {
            throw new InvalidInquiryRequestException(STATUS_REASON_MESSAGE);
        }
        return normalizedReason;
    }

    private InquiryPolicy() {
    }
}
