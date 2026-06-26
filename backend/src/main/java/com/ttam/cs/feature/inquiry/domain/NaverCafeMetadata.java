package com.ttam.cs.feature.inquiry.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NaverCafeMetadata(
    Long cafeId,
    Long articleId,
    MenuInfo menu,
    String articleUrl,
    WriterInfo writer,
    MetricsInfo metrics,
    List<String> imageUrls
) implements ChannelMetadata {

    @Override
    public String getUniqueKey() {
        return cafeId + "_" + articleId;
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
}
