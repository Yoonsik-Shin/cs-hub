package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegisterInquiryWorkLogUseCaseTest {

    private static final OperatorInfo OPERATOR = new OperatorInfo("operator", "담당자", "operator@example.com");

    @Mock
    private CustomerInquiryRepository inquiryRepository;

    @Mock
    private InquiryWorkLogRepository workLogRepository;

    @Mock
    private CustomerInquiry inquiry;

    private RegisterInquiryWorkLogUseCase useCase;
    private UUID inquiryId;

    @BeforeEach
    void setUp() {
        useCase = new RegisterInquiryWorkLogUseCase(inquiryRepository, workLogRepository);
        inquiryId = UUID.randomUUID();
        when(inquiryRepository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        when(inquiry.getStatus()).thenReturn(CustomerInquiry.Status.OPEN);
    }

    @Test
    void registersAnswerAndStatusChangeAsOneUseCase() {
        useCase.execute(inquiryId, new RegisterWorkLogRequest(
                OPERATOR,
                "답변 내용",
                null,
                CustomerInquiry.Status.RESOLVED,
                "답변 완료 처리"));

        verify(inquiry).updateStatus(any(CustomerInquiry.Status.class), any(OffsetDateTime.class));
        verify(inquiryRepository).save(inquiry);

        ArgumentCaptor<InquiryWorkLog> captor = ArgumentCaptor.forClass(InquiryWorkLog.class);
        verify(workLogRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<InquiryWorkLog> logs = captor.getAllValues();
        assertEquals(InquiryWorkLog.ActionType.ANSWER_SUBMITTED, logs.get(0).getActionType());
        assertEquals(InquiryWorkLog.ActionType.STATUS_CHANGED, logs.get(1).getActionType());
        assertEquals(CustomerInquiry.Status.OPEN, logs.get(1).getPreviousStatus());
        assertEquals(CustomerInquiry.Status.RESOLVED, logs.get(1).getCurrentStatus());
        assertEquals("답변 완료 처리", logs.get(1).getMemo());
    }

    @Test
    void rejectsStatusChangeBeforeWritingWhenReasonIsTooShort() {
        assertThrows(InvalidInquiryRequestException.class, () -> useCase.execute(inquiryId,
                new RegisterWorkLogRequest(OPERATOR, "답변", null, CustomerInquiry.Status.RESOLVED, "짧음")));

        verify(workLogRepository, never()).save(any());
        verify(inquiry, never()).updateStatus(any(), any());
        verify(inquiryRepository, never()).save(any());
    }
}
