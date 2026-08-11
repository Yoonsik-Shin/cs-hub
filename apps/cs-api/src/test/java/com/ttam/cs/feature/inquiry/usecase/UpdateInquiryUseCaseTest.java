package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryRequest;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UpdateInquiryUseCaseTest {

    private static final OperatorInfo OPERATOR = new OperatorInfo("operator", "담당자", null);

    @Mock
    private UpdateInquiryStatusUseCase statusUseCase;

    @Mock
    private UpdateInquiryFieldsUseCase fieldsUseCase;

    private UpdateInquiryUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new UpdateInquiryUseCase(statusUseCase, fieldsUseCase);
    }

    @Test
    void coordinatesStatusAndFieldChangesInOneTransactionalBoundary() throws Exception {
        UUID inquiryId = UUID.randomUUID();
        UpdateInquiryRequest request = request("수정 문의", "상태 변경 사유");

        useCase.execute(inquiryId, request, "127.0.0.1");

        verify(statusUseCase).execute(eq(inquiryId), any(UpdateInquiryStatusRequest.class));
        verify(fieldsUseCase).execute(eq(inquiryId), any(UpdateInquiryFieldsRequest.class), eq("127.0.0.1"));
        assertNotNull(AnnotationUtils.findAnnotation(
                UpdateInquiryUseCase.class.getMethod("execute", UUID.class, UpdateInquiryRequest.class, String.class),
                Transactional.class));
    }

    @Test
    void validatesStatusReasonBeforeStartingEitherChange() {
        UUID inquiryId = UUID.randomUUID();

        assertThrows(InvalidInquiryRequestException.class,
                () -> useCase.execute(inquiryId, request("수정 문의", "짧음"), "127.0.0.1"));

        verify(statusUseCase, never()).execute(any(), any(UpdateInquiryStatusRequest.class));
        verify(fieldsUseCase, never()).execute(any(), any(UpdateInquiryFieldsRequest.class), any());
    }

    private UpdateInquiryRequest request(String content, String statusReason) {
        return new UpdateInquiryRequest(
                OPERATOR,
                CustomerInquiry.Status.RESOLVED,
                null,
                null,
                null,
                content,
                null,
                null,
                Map.of("status", statusReason, "content", "문의 내용 수정 사유"));
    }
}
