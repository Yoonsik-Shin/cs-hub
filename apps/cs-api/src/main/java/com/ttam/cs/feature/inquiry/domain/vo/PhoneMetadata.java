package com.ttam.cs.feature.inquiry.domain.vo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PhoneMetadata(
    String phoneNumber,
    String memo,
    Map<String, Object> customFields
) implements ChannelMetadata {

    @Override
    public String getUniqueKey() {
        return null;
    }

    @Override
    public PhoneMetadata withCustomFields(Map<String, Object> customFields) {
        return new PhoneMetadata(phoneNumber, memo, customFields);
    }
}
