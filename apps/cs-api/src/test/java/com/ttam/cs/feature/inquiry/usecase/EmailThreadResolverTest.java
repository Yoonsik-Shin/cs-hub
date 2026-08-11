package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.GoogleSheetMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailThreadResolverTest {

    private static final Instant NOW = Instant.parse("2026-07-10T03:00:00Z");

    @Mock
    private CustomerInquiryRepository repository;

    @Mock
    private EmailSenderHasher emailSenderHasher;

    private EmailThreadResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new EmailThreadResolver(
                repository,
                emailSenderHasher,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void nonEmailMetadataDoesNotSearchForThread() {
        GoogleSheetMetadata metadata = new GoogleSheetMetadata("문의", "기타", 1, "contact", null, Map.of());

        assertTrue(resolver.resolve("GOOGLE_SHEET", metadata).isEmpty());
        verify(repository, never()).findEmailByMessageId(any());
    }

    @Test
    void referencesAreSearchedInHeaderOrder() {
        UUID parentId = UUID.randomUUID();
        CustomerInquiry parent = mock(CustomerInquiry.class);
        when(parent.getId()).thenReturn(parentId);
        when(repository.findEmailByMessageId("missing-message")).thenReturn(Optional.empty());
        when(repository.findEmailByMessageId("parent-message")).thenReturn(Optional.of(parent));

        EmailMetadata metadata = emailMetadata(
                "Re: 문의",
                "customer@test.com",
                new EmailMetadata.Headers("<reply>", "", "<missing-message> <parent-message>")
        );

        assertEquals(Optional.of(parentId), resolver.resolve("EMAIL", metadata));
    }

    @Test
    void senderAndNormalizedSubjectAreUsedAsLastFallback() {
        UUID rootId = UUID.randomUUID();
        CustomerInquiry candidate = mock(CustomerInquiry.class);
        when(candidate.getParentId()).thenReturn(rootId);
        when(candidate.getChannelMetadata()).thenReturn(emailMetadata(
                "문의드립니다",
                "customer@test.com",
                new EmailMetadata.Headers("<original>", "", "")
        ));
        when(emailSenderHasher.hash("Customer <customer@test.com>")).thenReturn("sender-hash");
        when(repository.findEmailCandidatesBySender(org.mockito.ArgumentMatchers.eq("sender-hash"), any(OffsetDateTime.class)))
                .thenReturn(List.of(candidate));

        EmailMetadata reply = emailMetadata(
                "Re: FW: 문의드립니다",
                "Customer <customer@test.com>",
                new EmailMetadata.Headers("<reply>", "", "")
        );

        assertEquals(Optional.of(rootId), resolver.resolve("EMAIL", reply));
        verify(repository).findEmailCandidatesBySender(
                "sender-hash",
                OffsetDateTime.parse("2026-07-03T03:00:00Z")
        );
    }

    private EmailMetadata emailMetadata(String subject, String from, EmailMetadata.Headers headers) {
        return new EmailMetadata(from, "cs@test.com", subject, "2026-07-10T00:00:00Z", headers, null);
    }
}
