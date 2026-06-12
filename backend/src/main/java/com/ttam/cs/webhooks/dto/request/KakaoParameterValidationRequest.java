package com.ttam.cs.webhooks.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoParameterValidationRequest(
    boolean isInSlotFilling,
    String utterance,
    Value value,
    User user
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Value(
        String origin,
        String resolved
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record User(
        String id,
        String type
    ) {}
}
