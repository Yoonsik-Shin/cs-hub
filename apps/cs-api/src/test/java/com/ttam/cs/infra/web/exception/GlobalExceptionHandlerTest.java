package com.ttam.cs.infra.web.exception;

import com.ttam.cs.feature.inquiry.exception.InquiryNotFoundException;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void inquiryNotFoundHasStableNotFoundContract() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBusinessException(new InquiryNotFoundException());

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("INQUIRY_NOT_FOUND");
        assertThat(response.getBody().message()).isEqualTo("존재하지 않는 문의입니다.");
    }

    @Test
    void invalidInquiryRequestKeepsSpecificReason() {
        ResponseEntity<ErrorResponse> response = handler.handleBusinessException(
                new InvalidInquiryRequestException("상태 변경 사유는 필수입니다."));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("INVALID_INPUT");
        assertThat(response.getBody().message()).isEqualTo("상태 변경 사유는 필수입니다.");
    }
}
