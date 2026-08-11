package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EmailArticleUrlResolver {

    private static final String DEFAULT_WEBMAIL_URL = "https://company.daouoffice.com/app/mail";

    private final String webmailUrl;

    public EmailArticleUrlResolver(
            @Value("${cs.email.webmail-url:https://company.daouoffice.com/app/mail}") String webmailUrl
    ) {
        this.webmailUrl = webmailUrl;
    }

    public EmailMetadata resolve(EmailMetadata metadata) {
        if (hasText(metadata.articleUrl())) {
            return metadata;
        }

        Long uid = emailUid(metadata);
        String articleUrl = uid != null
                ? appendQueryParam("uid", String.valueOf(uid))
                : appendQueryParam("messageId", cleanMessageId(metadata.getMessageId()));

        return new EmailMetadata(
                metadata.from(),
                metadata.to(),
                metadata.subject(),
                metadata.date(),
                metadata.headers(),
                metadata.attributes(),
                articleUrl,
                metadata.customFields()
        );
    }

    private String appendQueryParam(String name, String value) {
        String base = hasText(webmailUrl) ? webmailUrl : DEFAULT_WEBMAIL_URL;
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + name + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private Long emailUid(EmailMetadata metadata) {
        return metadata.attributes() != null ? metadata.attributes().uid() : null;
    }

    private String cleanMessageId(String messageId) {
        return messageId != null ? messageId.replace("<", "").replace(">", "").trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
