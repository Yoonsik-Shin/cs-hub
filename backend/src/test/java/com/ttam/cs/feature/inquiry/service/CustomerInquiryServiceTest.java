package com.ttam.cs.feature.inquiry.service;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.feature.inquiry.api.http.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryStatusRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerInquiryServiceTest {

    @Mock
    private CustomerInquiryRepository repository;

    @Mock
    private InquiryWorkLogRepository workLogRepository;

    @InjectMocks
    private CustomerInquiryService service;

    private UUID inquiryId;
    private CustomerInquiry inquiry;
    private OperatorInfo operatorInfo;

    @BeforeEach
    void setUp() {
        inquiryId = UUID.randomUUID();
        operatorInfo = new OperatorInfo("admin_01", "김관리자", "admin@ttam.com");
        
        inquiry = mock(CustomerInquiry.class);
        lenient().when(inquiry.getId()).thenReturn(inquiryId);
        lenient().when(inquiry.getStatus()).thenReturn(CustomerInquiry.Status.OPEN);
    }

    @Test
    void testAddWorkLog_Success() {
        // Given
        when(repository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        RegisterWorkLogRequest request = new RegisterWorkLogRequest(operatorInfo, "답변 내용입니다.", "내부 메모입니다.");

        // When
        UUID logId = service.addWorkLog(inquiryId, request);

        // Then
        assertNotNull(logId);
        verify(workLogRepository, times(1)).save(any(InquiryWorkLog.class));
    }

    @Test
    void testUpdateStatus_Success() {
        // Given
        when(repository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        UpdateInquiryStatusRequest request = new UpdateInquiryStatusRequest(operatorInfo, CustomerInquiry.Status.IN_PROGRESS);

        // When
        service.updateStatus(inquiryId, request);

        // Then
        verify(inquiry, times(1)).updateStatus(eq(CustomerInquiry.Status.IN_PROGRESS), any());
        verify(repository, times(1)).save(inquiry);
        verify(workLogRepository, times(1)).save(any(InquiryWorkLog.class));
    }
}
