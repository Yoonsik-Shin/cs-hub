package com.ttam.cs.feature.inquiry.domain.vo;

public record GoogleSheetMetadata(
    String type,
    String category,
    Integer rowNumber,
    String contact,
    ReplyInfo reply
) implements ChannelMetadata {

    @Override
    public String getUniqueKey() {
        return "row_" + rowNumber;
    }

    public record ReplyInfo(
        String type,
        String email
    ) {}
}
