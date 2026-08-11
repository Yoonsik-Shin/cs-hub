package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResolvedInquiryReopenerTest {

    private static final Instant NOW = Instant.parse("2026-07-10T03:00:00Z");

    @Mock
    private CustomerInquiryRepository inquiryRepository;

    @Mock
    private InquiryWorkLogRepository workLogRepository;

    private ResolvedInquiryReopener reopener;

    @BeforeEach
    void setUp() {
        reopener = new ResolvedInquiryReopener(
                inquiryRepository,
                workLogRepository,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void openInquiryIsNotChanged() {
        UUID inquiryId = UUID.randomUUID();
        CustomerInquiry inquiry = mock(CustomerInquiry.class);
        when(inquiry.getStatus()).thenReturn(CustomerInquiry.Status.OPEN);
        when(inquiryRepository.findById(inquiryId)).thenReturn(Optional.of(inquiry));

        reopener.reopen(inquiryId);

        verify(inquiry, never()).updateStatus(any(), any());
        verify(inquiryRepository, never()).save(any());
        verify(workLogRepository, never()).save(any());
    }

    @Test
    void resolvedInquiryIsReopenedWithSystemHistory() {
        UUID inquiryId = UUID.randomUUID();
        CustomerInquiry inquiry = mock(CustomerInquiry.class);
        when(inquiry.getId()).thenReturn(inquiryId);
        when(inquiry.getStatus()).thenReturn(CustomerInquiry.Status.RESOLVED);
        when(inquiryRepository.findById(inquiryId)).thenReturn(Optional.of(inquiry));

        reopener.reopen(inquiryId);

        verify(inquiry).updateStatus(CustomerInquiry.Status.OPEN, OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC));
        verify(inquiryRepository).save(inquiry);

        ArgumentCaptor<InquiryWorkLog> logCaptor = ArgumentCaptor.forClass(InquiryWorkLog.class);
        verify(workLogRepository).save(logCaptor.capture());
        InquiryWorkLog workLog = logCaptor.getValue();
        assertEquals(inquiryId, workLog.getInquiryId());
        assertEquals(InquiryWorkLog.ActionType.STATUS_CHANGED, workLog.getActionType());
        assertEquals(CustomerInquiry.Status.RESOLVED, workLog.getPreviousStatus());
        assertEquals(CustomerInquiry.Status.OPEN, workLog.getCurrentStatus());
        assertEquals("system", workLog.getOperatorInfo().id());
    }
}
