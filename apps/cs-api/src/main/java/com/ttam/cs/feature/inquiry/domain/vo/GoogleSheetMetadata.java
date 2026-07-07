package com.ttam.cs.feature.inquiry.domain.vo;

import java.util.Map;

public record GoogleSheetMetadata(
    String type,
    String category,
    Integer rowNumber,
    String contact,
    ReplyInfo reply,
    Map<String, Object> customFields
) implements ChannelMetadata {

    @Override
    public String getUniqueKey() {
        return "row_" + rowNumber;
    }

    @Override
    public GoogleSheetMetadata withCustomFields(Map<String, Object> customFields) {
        return new GoogleSheetMetadata(type, category, rowNumber, contact, reply, customFields);
    }

    public record ReplyInfo(
        String type,
        String email
    ) {}
}
