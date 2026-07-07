package com.ttam.cs.feature.inquiry.domain.vo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailMetadata(
    String from,
    String to,
    String subject,
    String date,
    Headers headers,
    Attributes attributes,
    String articleUrl,
    Map<String, Object> customFields
) implements ChannelMetadata {

    public EmailMetadata(String from, String to, String subject, String date, Headers headers, Attributes attributes) {
        this(from, to, subject, date, headers, attributes, null, null);
    }

    public EmailMetadata(String from, String to, String subject, String date, Headers headers, Attributes attributes, String articleUrl) {
        this(from, to, subject, date, headers, attributes, articleUrl, null);
    }


    @Override
    public String getUniqueKey() {
        if (headers != null && headers.messageId() != null && !headers.messageId().isBlank()) {
            return headers.messageId();
        }
        if (attributes != null && attributes.uid() != null) {
            return "uid_" + attributes.uid();
        }
        return null;
    }

    @Override
    public EmailMetadata withCustomFields(Map<String, Object> customFields) {
        return new EmailMetadata(from, to, subject, date, headers, attributes, articleUrl, customFields);
    }

    public String getMessageId() {
        return headers != null ? headers.messageId() : null;
    }

    public String getInReplyTo() {
        return headers != null ? headers.inReplyTo() : null;
    }

    public String getReferences() {
        return headers != null ? headers.references() : null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Headers(
        @JsonProperty("message-id") String messageId,
        @JsonProperty("in-reply-to") String inReplyTo,
        @JsonProperty("references") String references
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Attributes(
        Long uid
    ) {}
}
