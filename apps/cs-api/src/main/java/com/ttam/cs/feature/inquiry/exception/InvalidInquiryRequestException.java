package com.ttam.cs.feature.inquiry.exception;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;

public class InvalidInquiryRequestException extends BusinessException {

    public InvalidInquiryRequestException(String message) {
        super(ErrorCode.INVALID_INPUT, message);
    }
}
