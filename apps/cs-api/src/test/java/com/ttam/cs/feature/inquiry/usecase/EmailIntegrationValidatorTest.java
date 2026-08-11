package com.ttam.cs.feature.inquiry.usecase;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import java.util.List;
import org.junit.jupiter.api.Test;

class EmailIntegrationValidatorTest {

    private final EmailIntegrationValidator validator = new EmailIntegrationValidator();

    @Test
    void rejectsMetadataFromAnotherChannel() {
        assertThrows(
                InvalidInquiryRequestException.class,
                () -> validator.validate(
                        new NaverCafeMetadata(null, null, null, null, null, null, null, null, null),
                        "content",
                        List.of()
                )
        );
    }

    @Test
    void rejectsEmailWithoutTextOrImages() {
        EmailMetadata metadata = emailMetadata("<message-id>", null);

        assertThrows(
                InvalidInquiryRequestException.class,
                () -> validator.validate(metadata, "  ", List.of())
        );
    }

    @Test
    void acceptsImageOnlyEmail() {
        EmailMetadata metadata = emailMetadata("<message-id>", null);

        EmailMetadata result = assertDoesNotThrow(
                () -> validator.validate(metadata, "\n", List.of("email/image.png"))
        );

        assertSame(metadata, result);
    }

    @Test
    void rejectsEmailWithoutMessageIdOrImapUid() {
        EmailMetadata metadata = emailMetadata("", null);

        assertThrows(
                InvalidInquiryRequestException.class,
                () -> validator.validate(metadata, "content", List.of())
        );
    }

    @Test
    void acceptsImapUidAsEmailIdentity() {
        EmailMetadata metadata = emailMetadata(null, 148L);

        assertDoesNotThrow(() -> validator.validate(metadata, "content", List.of()));
    }

    private EmailMetadata emailMetadata(String messageId, Long uid) {
        EmailMetadata.Attributes attributes = uid != null ? new EmailMetadata.Attributes(uid) : null;
        return new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의드립니다",
                "2026-07-10T00:00:00Z",
                new EmailMetadata.Headers(messageId, "", ""),
                attributes
        );
    }
}
