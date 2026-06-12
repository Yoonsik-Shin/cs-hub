package com.ttam.cs.webhooks.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record KakaoParameterValidationResponse(
    String status,
    String value,
    Object data,
    String message
) {
    public static KakaoParameterValidationResponse success(String value) {
        return new KakaoParameterValidationResponse("SUCCESS", value, null, null);
    }

    public static KakaoParameterValidationResponse fail(String message) {
        return new KakaoParameterValidationResponse("FAIL", null, null, message);
    }
}
