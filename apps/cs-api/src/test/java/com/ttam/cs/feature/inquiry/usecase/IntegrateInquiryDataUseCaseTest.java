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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

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

    private IntegrateInquiryDataUseCase useCase;

    private static final String WEBMAIL_URL = "https://company.daouoffice.com/app/mail";

    @BeforeEach
    void setUp() {
        EmailThreadResolver emailThreadResolver = new EmailThreadResolver(repository, piiEncryptionUtils);
        ResolvedInquiryReopener resolvedInquiryReopener = new ResolvedInquiryReopener(
                repository,
                workLogRepository,
                Clock.fixed(Instant.parse("2026-07-10T00:00:00Z"), ZoneOffset.UTC)
        );
        useCase = new IntegrateInquiryDataUseCase(
                repository,
                uniqueKeyGenerator,
                storageService,
                adminMemberRepository,
                piiEncryptionUtils,
                emailThreadResolver,
                resolvedInquiryReopener
        );
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
    void testIntegrateInquiries_AddsMessageIdToWebmailUrlWhenArticleUrlMissing() {
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
            assertEquals(WEBMAIL_URL + "?messageId=msg-123", meta.articleUrl());
            return true;
        }));
    }

    @Test
    void testIntegrateInquiries_PreservesEmailArticleUrlFromIntegrationPayload() {
        // Given
        String articleUrl = WEBMAIL_URL + "?uid=148";
        EmailMetadata.Headers headers = new EmailMetadata.Headers("<msg-148>", "", "");
        EmailMetadata.Attributes attributes = new EmailMetadata.Attributes(148L);
        EmailMetadata channelMetadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의 추가 이미지",
                "2026-07-09T01:09:09Z",
                headers,
                attributes,
                articleUrl
        );

        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-09T01:09:09Z",
                null,
                channelMetadata,
                null,
                "이미지 확인 부탁드립니다.",
                List.of("email/20260709/uid_148/image_1.jpg")
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);
        when(storageService.extractObjectKey("email/20260709/uid_148/image_1.jpg"))
                .thenReturn("email/20260709/uid_148/image_1.jpg");
        when(uniqueKeyGenerator.generateUniqueKey(any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

        // When
        useCase.execute("EMAIL", List.of(item));

        // Then
        verify(repository, times(1)).bulkInsert(argThat(inquiries -> {
            EmailMetadata meta = (EmailMetadata) inquiries.get(0).getChannelMetadata();
            assertEquals(articleUrl, meta.articleUrl());
            assertEquals(List.of("email/20260709/uid_148/image_1.jpg"), inquiries.get(0).getImageUrls());
            return true;
        }));
    }

    @Test
    void testIntegrateInquiries_EmailWithBlankContentThrows() {
        // Given
        EmailMetadata.Headers headers = new EmailMetadata.Headers("<msg-empty>", "", "");
        EmailMetadata channelMetadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의",
                "2026-07-09T01:09:09Z",
                headers,
                null
        );

        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-09T01:09:09Z",
                null,
                channelMetadata,
                null,
                "   ",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);

        // When & Then
        assertThrows(IllegalArgumentException.class, () -> useCase.execute("EMAIL", List.of(item)));
        verify(repository, never()).bulkInsert(anyList());
    }

    @Test
    void testIntegrateInquiries_EmailWithBlankContentAndImageIsAccepted() {
        // Given
        EmailMetadata.Headers headers = new EmailMetadata.Headers("<msg-image-only>", "", "");
        EmailMetadata.Attributes attributes = new EmailMetadata.Attributes(146L);
        EmailMetadata channelMetadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의 추가 이미지",
                "2026-07-09T00:36:40Z",
                headers,
                attributes
        );

        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-09T00:36:40Z",
                null,
                channelMetadata,
                null,
                "\n",
                List.of("email/20260709/msg-image-only/image_0.jpg")
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);
        when(storageService.extractObjectKey("email/20260709/msg-image-only/image_0.jpg"))
                .thenReturn("email/20260709/msg-image-only/image_0.jpg");
        when(uniqueKeyGenerator.generateUniqueKey(any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

        // When
        useCase.execute("EMAIL", List.of(item));

        // Then
        verify(repository, times(1)).bulkInsert(argThat(inquiries -> {
            assertEquals(1, inquiries.size());
            assertEquals(List.of("email/20260709/msg-image-only/image_0.jpg"), inquiries.get(0).getImageUrls());
            return true;
        }));
    }

    @Test
    void replyToReplyLinksToRootInquiry() {
        UUID rootId = UUID.randomUUID();
        CustomerInquiry previousReply = mock(CustomerInquiry.class);
        when(previousReply.getParentId()).thenReturn(rootId);

        CustomerInquiry root = mock(CustomerInquiry.class);
        when(root.getStatus()).thenReturn(CustomerInquiry.Status.OPEN);

        EmailMetadata metadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "Re: Re: 문의드립니다",
                "2026-07-10T00:00:00Z",
                new EmailMetadata.Headers("<reply-2>", "<reply-1>", ""),
                null
        );
        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-10T00:00:00Z",
                "user_01",
                metadata,
                null,
                "두 번째 회신입니다.",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);
        when(repository.findEmailByMessageId("reply-1")).thenReturn(Optional.of(previousReply));
        when(repository.findById(rootId)).thenReturn(Optional.of(root));
        when(uniqueKeyGenerator.generateUniqueKey(any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

        useCase.execute("EMAIL", List.of(item));

        verify(repository).bulkInsert(argThat(inquiries -> {
            assertEquals(rootId, inquiries.get(0).getParentId());
            return true;
        }));
        verify(repository, never()).save(root);
        verify(workLogRepository, never()).save(any());
    }

    @Test
    void replyToOpenInquiryDoesNotCreateReopenHistory() {
        UUID parentId = UUID.randomUUID();
        CustomerInquiry parent = mock(CustomerInquiry.class);
        when(parent.getId()).thenReturn(parentId);
        when(parent.getStatus()).thenReturn(CustomerInquiry.Status.OPEN);

        EmailMetadata metadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "Re: 문의드립니다",
                "2026-07-10T00:00:00Z",
                new EmailMetadata.Headers("<reply-message>", "<parent-message>", ""),
                null
        );
        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-10T00:00:00Z",
                "user_01",
                metadata,
                null,
                "추가 문의입니다.",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);
        when(repository.findEmailByMessageId("parent-message")).thenReturn(Optional.of(parent));
        when(repository.findById(parentId)).thenReturn(Optional.of(parent));
        when(uniqueKeyGenerator.generateUniqueKey(any(), any(), any(), any(), any()))
                .thenReturn(UUID.randomUUID());

        useCase.execute("EMAIL", List.of(item));

        verify(parent, never()).updateStatus(any(), any());
        verify(repository, never()).save(parent);
        verify(workLogRepository, never()).save(any());
        verify(repository).bulkInsert(anyList());
    }

    @Test
    void emailWithoutMessageIdOrImapUidIsRejected() {
        EmailMetadata metadata = new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의드립니다",
                "2026-07-10T00:00:00Z",
                new EmailMetadata.Headers("", "", ""),
                null
        );
        IntegrateInquiryDataUseCase.IntegrationItem item = new IntegrateInquiryDataUseCase.IntegrationItem(
                "2026-07-10T00:00:00Z",
                "user_01",
                metadata,
                null,
                "문의 내용입니다.",
                List.of()
        );

        when(adminMemberRepository.existsByEmail("customer@test.com")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> useCase.execute("EMAIL", List.of(item)));
        verify(repository, never()).bulkInsert(anyList());
    }
}
