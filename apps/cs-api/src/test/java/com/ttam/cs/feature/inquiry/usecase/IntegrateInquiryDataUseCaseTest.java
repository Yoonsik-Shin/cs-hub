package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import com.ttam.cs.infra.storage.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IntegrateInquiryDataUseCaseTest {

    @Mock
    private CustomerInquiryRepository repository;

    @Mock
    private InquiryWorkLogRepository workLogRepository;

    @Mock
    private InquiryUniqueKeyGenerator uniqueKeyGenerator;

    @Mock
    private StorageService storageService;

    @Mock
    private AdminMemberRepository adminMemberRepository;

    @Mock
    private PiiEncryptionUtils piiEncryptionUtils;

    @InjectMocks
    private IntegrateInquiryDataUseCase useCase;

    private static final String WEBMAIL_URL = "https://company.daouoffice.com/app/mail";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(useCase, "webmailUrl", WEBMAIL_URL);
    }

    @Test
    void testIntegrateInquiries_WithEmailInReplyTo_LinksToParentAndReopens() {
        // Given
        UUID parentId = UUID.randomUUID();
        CustomerInquiry parent = mock(CustomerInquiry.class);
        when(parent.getId()).thenReturn(parentId);
        when(parent.getStatus()).thenReturn(CustomerInquiry.Status.RESOLVED);

        EmailMetadata.Headers headers = new EmailMetadata.Headers("<msg-123>", "<parent-msg-id>", "");
        EmailMetadata channelMetadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "Re: 문의드립니다",
                "2026-07-02T00:00:00Z",
                headers,
                null
        );

        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-02T12:00:00Z",
                "user_01",
                channelMetadata,
                null,
                "회신 내용입니다.",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);
        when(repository.findEmailByMessageId("parent-msg-id")).thenReturn(Optional.of(parent));
        when(repository.findById(parentId)).thenReturn(Optional.of(parent));
        when(uniqueKeyGenerator.generateUniqueKey(any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

        // When
        useCase.execute("EMAIL", List.of(item));

        // Then
        verify(parent, times(1)).updateStatus(eq(CustomerInquiry.Status.OPEN), any());
        verify(repository, times(1)).save(parent);
        verify(workLogRepository, times(1)).save(any(InquiryWorkLog.class));
        verify(repository, times(1)).bulkInsert(anyList());
    }

    @Test
    void testIntegrateInquiries_OutgoingReplyFromAdmin_IsFiltered() {
        // Given
        EmailMetadata.Headers headers = new EmailMetadata.Headers("<msg-reply-123>", "<msg-123>", "");
        EmailMetadata channelMetadata = new EmailMetadata(
                "cshub@ttam.ai", // admin member email
                "customer@test.com",
                "Re: 문의 답변드립니다",
                "2026-07-02T01:00:00Z",
                headers,
                null
        );

        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-02T13:00:00Z",
                "user_01",
                channelMetadata,
                null,
                "답장 내용입니다.",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("cshub@ttam.ai")).thenReturn(true);

        // When
        useCase.execute("EMAIL", List.of(item));

        // Then
        verify(repository, never()).bulkInsert(anyList());
    }

    @Test
    void testIntegrateInquiries_InjectsWebmailUrl() {
        // Given
        EmailMetadata.Headers headers = new EmailMetadata.Headers("<msg-123>", "", "");
        EmailMetadata channelMetadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의드립니다",
                "2026-07-02T00:00:00Z",
                headers,
                null
        );

        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-02T12:00:00Z",
                "user_01",
                channelMetadata,
                null,
                "문의 내용입니다.",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);
        when(uniqueKeyGenerator.generateUniqueKey(any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

        // When
        useCase.execute("EMAIL", List.of(item));

        // Then
        verify(repository, times(1)).bulkInsert(argThat(inquiries -> {
            assertEquals(1, inquiries.size());
            CustomerInquiry inquiry = inquiries.get(0);
            assertTrue(inquiry.getChannelMetadata() instanceof EmailMetadata);
            EmailMetadata meta = (EmailMetadata) inquiry.getChannelMetadata();
            assertEquals(WEBMAIL_URL, meta.articleUrl());
            return true;
        }));
    }
}
