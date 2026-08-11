package com.ttam.cs.feature.inquiry.exception;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;

public class InquiryNotFoundException extends BusinessException {

    public InquiryNotFoundException() {
        super(ErrorCode.INQUIRY_NOT_FOUND);
    }
}
