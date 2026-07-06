package com.ttam.cs.feature.auth.api.v1.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ttam.cs.feature.auth.api.v1.dto.AdminUserResponse;
import com.ttam.cs.feature.auth.usecase.AdminUserResolver;
import com.ttam.cs.feature.auth.usecase.N8nAccessTokenUseCase;
import com.ttam.cs.infra.security.AdminRole;
import com.ttam.cs.infra.security.RequireRoles;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * Nginx Basic Auth로 인증된 현재 사용자 정보를 반환하는 컨트롤러.
 *
 * Nginx가 proxy_set_header X-Remote-User $remote_user로 인증된 사용자명을 전달합니다.
 * 이 값을 admin_member DB 테이블과 매핑해 AdminUserResponse를 반환합니다.
 */
@Tag(name = "Auth API", description = "현재 로그인한 관리자 인증 상태, 권한 확인, 로그아웃, n8n UI 접근 권한을 다루는 API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AdminUserResolver adminUserResolver;
    private final N8nAccessTokenUseCase n8nAccessTokenUseCase;

    @Operation(summary = "현재 로그인 계정 조회", description = "Nginx Basic Auth로 인증되고 DB에 등록된 현재 관리자 계정 정보를 반환합니다.")
    @GetMapping("/me")
    public ResponseEntity<AdminUserResponse> me(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser) {
        return ResponseEntity.ok(AdminUserResponse.from(adminUserResolver.resolve(remoteUser)));
    }

    @GetMapping("/admin-check")
    @RequireRoles(AdminRole.ADMIN)
    @Operation(summary = "최고 관리자 권한 확인", description = "nginx auth_request에서 사용하는 내부 권한 확인 API입니다. 현재 Basic Auth 사용자에게 ADMIN 역할이 있는 경우 204를 반환합니다.")
    public ResponseEntity<Void> adminCheck() {
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/n8n-access")
    @RequireRoles(AdminRole.ADMIN)
    @Operation(summary = "n8n UI 접근 쿠키 발급", description = "ADMIN 사용자에게 n8n UI 접근용 임시 쿠키(cs_n8n_access)를 발급합니다. 이 쿠키는 /n8n 경로에서만 사용되며 기본 유효 시간은 900초입니다.")
    public ResponseEntity<Void> issueN8nAccess(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser) {
        if (remoteUser == null || remoteUser.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, "cs_n8n_access=" + n8nAccessTokenUseCase.issue(remoteUser.trim())
                + "; Max-Age=900; Path=/; HttpOnly; Secure; SameSite=Lax");
        return ResponseEntity.noContent().headers(headers).build();
    }

    @GetMapping("/n8n-check")
    @Operation(summary = "n8n UI 접근 쿠키 검증", description = "nginx auth_request 전용 API입니다. cs_n8n_access 쿠키가 유효하면 204를 반환하고, 유효하지 않으면 403을 반환합니다.")
    public ResponseEntity<Void> n8nCheck(
            @CookieValue(value = "cs_n8n_access", required = false) String n8nAccessToken) {
        if (n8nAccessTokenUseCase.isValidAdminToken(n8nAccessToken)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @Operation(summary = "로그아웃 및 계정 전환", description = "현재 사용자가 로그아웃하거나 계정을 전환할 수 있도록 WWW-Authenticate 401 도전을 보냅니다.")
    @GetMapping("/logout")
    public ResponseEntity<String> logout(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @RequestParam(value = "current", required = false) String currentUser,
            @CookieValue(value = "cs_auth_logout_challenge", required = false) String logoutChallenge) {
        HttpHeaders headers = new HttpHeaders();

        // 현재 사용자가 파라미터로 명시한 사용자(currentUser)와 동일하면,
        // 브라우저가 다시 로그인 챌린지 팝업을 띄우도록 401 Unauthorized 및 인증 렐름 정보를 전송합니다.
        if (remoteUser != null && remoteUser.equals(currentUser)) {
            if ("1".equals(logoutChallenge)) {
                headers.add(HttpHeaders.SET_COOKIE,
                        "cs_auth_logout_challenge=; Max-Age=0; Path=/api/v1/auth/logout; SameSite=Lax");
                headers.set("Location", "/");
                return new ResponseEntity<>("", headers, HttpStatus.FOUND);
            }

            headers.set("WWW-Authenticate", "Basic realm=\"Restricted Access - CS System\"");
            headers.add(HttpHeaders.SET_COOKIE,
                    "cs_auth_logout_challenge=1; Max-Age=30; Path=/api/v1/auth/logout; SameSite=Lax");
            String htmlBody = "<html>"
                    + "<head><meta charset=\"UTF-8\"><title>로그아웃 완료</title></head>"
                    + "<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; background-color: #f8fafc; color: #1e293b; margin: 0;\">"
                    + "  <div style=\"background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border: 1px solid #e2e8f0;\">"
                    + "    <h2 style=\"color: #ef4444; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;\">로그아웃 되었습니다</h2>"
                    + "    <p style=\"color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;\">다른 계정으로 전환하려면 새 계정을 입력해 주세요. 같은 계정을 다시 입력하면 기존 계정으로 계속 사용합니다.</p>"
                    + "    <a href=\"/\" style=\"display: inline-block; padding: 10px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; transition: background 0.15s ease;\">홈 화면으로 돌아가기</a>"
                    + "  </div>"
                    + "</body>"
                    + "</html>";
            return new ResponseEntity<>(htmlBody, headers, HttpStatus.UNAUTHORIZED);
        }

        // 사용자가 취소를 누르지 않고 새로운 계정을 입력하여 remoteUser 정보가 변경된 경우
        // 메인 화면으로 리다이렉트 시켜 신규 계정 세션으로 브라우저가 동작하도록 합니다.
        headers.add(HttpHeaders.SET_COOKIE,
                "cs_auth_logout_challenge=; Max-Age=0; Path=/api/v1/auth/logout; SameSite=Lax");
        headers.set("Location", "/");
        return new ResponseEntity<>("", headers, HttpStatus.FOUND);
    }
}
