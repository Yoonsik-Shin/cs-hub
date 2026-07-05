package com.ttam.cs.feature.auth.api.dto;

import com.ttam.cs.feature.auth.usecase.dto.CurrentAdminUser;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "현재 로그인한 관리자 계정 정보 응답")
public record AdminUserResponse(
        @Schema(description = "계정 ID (htpasswd username)") String id,
        @Schema(description = "표시 이름") String nickname,
        @Schema(description = "이메일") String email,
        @Schema(description = "역할") String role
) {
    public static AdminUserResponse from(CurrentAdminUser user) {
        return new AdminUserResponse(user.id(), user.nickname(), user.email(), user.role());
    }
}
