package com.ttam.cs.feature.auth.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OneTimeLoginRequest(
        String id,
        @NotBlank(message = "일회용 로그인 코드는 필수입니다.")
        String code,
        String token
) {
    public String normalizedId() {
        return id == null || id.isBlank() ? "default" : id.trim();
    }
}
