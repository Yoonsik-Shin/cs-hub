package com.ttam.cs.feature.inquiry.service;

import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.feature.inquiry.api.http.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.domain.DeviceInfo;
import java.util.Map;
import java.util.List;
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

    @Test
    void testUpdateStatuses_Success() {
        // Given
        UUID inquiryId2 = UUID.randomUUID();
        CustomerInquiry inquiry2 = mock(CustomerInquiry.class);
        lenient().when(inquiry2.getId()).thenReturn(inquiryId2);
        lenient().when(inquiry2.getStatus()).thenReturn(CustomerInquiry.Status.OPEN);

        when(repository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        when(repository.findById(inquiryId2)).thenReturn(Optional.of(inquiry2));

        List<UUID> ids = List.of(inquiryId, inquiryId2);

        // When
        service.updateStatuses(ids, CustomerInquiry.Status.IN_PROGRESS, operatorInfo);

        // Then
        verify(inquiry, times(1)).updateStatus(eq(CustomerInquiry.Status.IN_PROGRESS), any());
        verify(inquiry2, times(1)).updateStatus(eq(CustomerInquiry.Status.IN_PROGRESS), any());
        verify(repository, times(1)).save(inquiry);
        verify(repository, times(1)).save(inquiry2);
        verify(workLogRepository, times(2)).save(any(InquiryWorkLog.class));
    }

    @Test
    void testUpdateInquiryFields_Success() {
        // Given
        when(repository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        when(inquiry.getChannel()).thenReturn("EMAIL");
        when(inquiry.getUserCode()).thenReturn("user_old");
        when(inquiry.getContent()).thenReturn("Old content");
        when(inquiry.getDeviceInfo()).thenReturn(new DeviceInfo("1.0.0", "iPhone", "17.0"));

        UpdateInquiryFieldsRequest request = new UpdateInquiryFieldsRequest(
                operatorInfo,
                "KAKAO",
                "user_new",
                new DeviceInfo("1.1.0", "iPhone", "17.1"),
                "New content",
                null, // imageUrls
                Map.of(
                        "channel", "Correcting channel",
                        "userCode", "Updated user code",
                        "deviceInfo", "App upgrade",
                        "content", "Editing content typo"
                )
        );

        // When
        service.updateInquiryFields(inquiryId, request, "127.0.0.1");

        // Then
        verify(inquiry, times(1)).updateChannel("KAKAO");
        verify(inquiry, times(1)).updateUserCode("user_new");
        verify(inquiry, times(1)).updateDeviceInfo(any(DeviceInfo.class));
        verify(inquiry, times(1)).updateContent("New content");
        verify(repository, times(1)).save(inquiry);
        verify(workLogRepository, times(1)).save(any(InquiryWorkLog.class));
    }

    @Test
    void testUpdateInquiryFields_MissingReason_ThrowsException() {
        // Given
        when(repository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        when(inquiry.getChannel()).thenReturn("EMAIL");

        UpdateInquiryFieldsRequest request = new UpdateInquiryFieldsRequest(
                operatorInfo,
                "KAKAO", // changed
                null,
                null,
                null,
                null, // imageUrls
                Map.of() // missing reason for channel
        );

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> 
                service.updateInquiryFields(inquiryId, request, "127.0.0.1")
        );
        assertEquals("channel 수정 사유를 입력해주세요.", exception.getMessage());
    }
}
