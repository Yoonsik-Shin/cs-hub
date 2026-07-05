package com.ttam.cs.feature.auth.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SessionSaveRequest(
        String id,
        @NotBlank(message = "cookiesJson은 필수입니다.")
        String cookiesJson
) {
    public String normalizedId() {
        return id == null || id.isBlank() ? "default" : id.trim();
    }
}
