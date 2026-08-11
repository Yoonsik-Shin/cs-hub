package com.ttam.cs.feature.inquiry.usecase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import org.junit.jupiter.api.Test;

class EmailArticleUrlResolverTest {

    private static final String WEBMAIL_URL = "https://company.daouoffice.com/app/mail";

    @Test
    void preservesArticleUrlProvidedByIntegration() {
        EmailArticleUrlResolver resolver = new EmailArticleUrlResolver(WEBMAIL_URL);
        EmailMetadata metadata = emailMetadata("<message-id>", 148L, "https://mail.example/messages/148");

        EmailMetadata result = resolver.resolve(metadata);

        assertSame(metadata, result);
    }

    @Test
    void prefersImapUidOverMessageId() {
        EmailArticleUrlResolver resolver = new EmailArticleUrlResolver(WEBMAIL_URL);

        EmailMetadata result = resolver.resolve(emailMetadata("<message-id>", 148L, null));

        assertEquals(WEBMAIL_URL + "?uid=148", result.articleUrl());
    }

    @Test
    void encodesCleanMessageIdWhenUidIsMissing() {
        EmailArticleUrlResolver resolver = new EmailArticleUrlResolver(WEBMAIL_URL);

        EmailMetadata result = resolver.resolve(emailMetadata(" <id/with+sign@test> ", null, null));

        assertEquals(WEBMAIL_URL + "?messageId=id%2Fwith%2Bsign%40test", result.articleUrl());
    }

    @Test
    void appendsParameterToConfiguredQueryString() {
        EmailArticleUrlResolver resolver = new EmailArticleUrlResolver(WEBMAIL_URL + "?folder=inbox");

        EmailMetadata result = resolver.resolve(emailMetadata("<message-id>", 148L, null));

        assertEquals(WEBMAIL_URL + "?folder=inbox&uid=148", result.articleUrl());
    }

    @Test
    void usesDefaultUrlWhenConfigurationIsBlank() {
        EmailArticleUrlResolver resolver = new EmailArticleUrlResolver("  ");

        EmailMetadata result = resolver.resolve(emailMetadata("<message-id>", null, null));

        assertEquals(WEBMAIL_URL + "?messageId=message-id", result.articleUrl());
    }

    private EmailMetadata emailMetadata(String messageId, Long uid, String articleUrl) {
        EmailMetadata.Attributes attributes = uid != null ? new EmailMetadata.Attributes(uid) : null;
        return new EmailMetadata(
                "customer@test.com",
                "cs@test.com",
                "문의드립니다",
                "2026-07-10T00:00:00Z",
                new EmailMetadata.Headers(messageId, "", ""),
                attributes,
                articleUrl
        );
    }
}
