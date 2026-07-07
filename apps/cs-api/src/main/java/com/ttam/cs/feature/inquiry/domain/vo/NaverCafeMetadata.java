package com.ttam.cs.feature.inquiry.domain.vo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NaverCafeMetadata(
    Long cafeId,
    Long articleId,
    MenuInfo menu,
    String articleUrl,
    WriterInfo writer,
    MetricsInfo metrics,
    List<String> imageUrls,
    List<CommentInfo> comments,
    Map<String, Object> customFields
) implements ChannelMetadata {

    @Override
    public String getUniqueKey() {
        return cafeId + "_" + articleId;
    }

    @Override
    public NaverCafeMetadata withCustomFields(Map<String, Object> customFields) {
        return new NaverCafeMetadata(cafeId, articleId, menu, articleUrl, writer, metrics, imageUrls, comments, customFields);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MenuInfo(
        Long id,
        String name
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WriterInfo(
        String id,
        String nickname
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MetricsInfo(
        Integer readCount,
        Integer commentCount,
        Integer likeCount
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CommentInfo(
        Long commentId,
        String content,
        WriterInfo writer,
        String writeDate,
        Boolean isOperator,
        List<String> imageUrls
    ) {}
}
