package com.ttam.cs.feature.inquiry.domain.vo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EmailMetadata(
    String from,
    String to,
    String subject,
    String date,
    Headers headers,
    Attributes attributes
) implements ChannelMetadata {

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
