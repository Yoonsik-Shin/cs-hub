package com.ttam.cs.feature.auth.api;

import com.ttam.cs.feature.auth.api.dto.AdminUserResponse;
import com.ttam.cs.feature.auth.domain.AdminUser;
import com.ttam.cs.infra.config.AdminUserProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Nginx Basic Auth로 인증된 현재 사용자 정보를 반환하는 컨트롤러.
 *
 * Nginx가 proxy_set_header X-Remote-User $remote_user로 인증된 사용자명을 전달합니다.
 * 이 값을 application.yml의 admin.users 설정과 매핑해 AdminUserResponse를 반환합니다.
 */
@Tag(name = "Auth API", description = "현재 로그인한 관리자 계정 정보 조회 API")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AdminUserProperties adminUserProperties;

    @Operation(
            summary = "현재 로그인 계정 조회",
            description = "Nginx Basic Auth로 인증된 현재 사용자 정보를 반환합니다. "
                    + "X-Remote-User 헤더가 없거나 미등록 계정이면 fallback 값이 반환됩니다."
    )
    @GetMapping("/me")
    public ResponseEntity<AdminUserResponse> me(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser
    ) {
        AdminUser user = adminUserProperties.resolve(remoteUser);
        return ResponseEntity.ok(AdminUserResponse.from(user));
    }
}
