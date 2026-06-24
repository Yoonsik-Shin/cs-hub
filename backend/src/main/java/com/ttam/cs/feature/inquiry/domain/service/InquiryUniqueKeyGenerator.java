package com.ttam.cs.feature.inquiry.domain.service;

import com.ttam.cs.feature.inquiry.domain.ChannelMetadata;
import org.springframework.stereotype.Component;
import java.time.OffsetDateTime;

@Component
public class InquiryUniqueKeyGenerator {

    public java.util.UUID generateUniqueKey(String channel, OffsetDateTime timestamp,
            String userCode, ChannelMetadata channelMetadata, String content) {

        String rawKey;
        if (channelMetadata != null && channelMetadata.getUniqueKey() != null) {
            rawKey = channel.toUpperCase() + "_" + channelMetadata.getUniqueKey();
        } else {
            long timeMs = (timestamp != null) ? timestamp.toInstant().toEpochMilli() : 0L;
            String user = (userCode != null && !userCode.isBlank()) ? userCode
                    : "anonymous";
            int contentHash = (content != null) ? content.hashCode() : 0;
            rawKey = String.format("%s_%d_%s_%d", channel.toUpperCase(), timeMs, user,
                    contentHash);
        }

        return java.util.UUID.nameUUIDFromBytes(rawKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
