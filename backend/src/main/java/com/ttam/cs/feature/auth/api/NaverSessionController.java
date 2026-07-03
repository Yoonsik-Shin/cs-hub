package com.ttam.cs.feature.auth.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.infra.security.RequireInternalAuth;
import com.ttam.cs.feature.auth.domain.NaverCafeSession;
import com.ttam.cs.feature.auth.repo.NaverCafeSessionRepository;
import com.ttam.cs.feature.auth.service.NaverSessionService;
import com.ttam.cs.common.util.EncryptionUtils;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Naver Session Management", description = "네이버 카페 세션 관리 API. 세션 저장, 조회, 검증 및 상태 획득 등을 처리합니다.")
@RestController
@RequestMapping("/api/internal/v1/naver/session")
@RequiredArgsConstructor
@Slf4j
public class NaverSessionController {

    private final NaverCafeSessionRepository repository;
    private final NaverSessionService naverSessionService;
    private final EncryptionUtils encryptionUtils;
    private final ObjectMapper objectMapper;

    @Operation(summary = "네이버 카페 세션 저장", description = "로그인된 네이버 쿠키 JSON을 암호화하여 저장합니다. 내부 시스템 토큰 인증이 필요합니다.")
    @PostMapping
    @RequireInternalAuth
    public ResponseEntity<Void> saveSession(@RequestBody SessionSaveRequest request) {
        String encrypted = encryptionUtils.encrypt(request.getCookiesJson());

        String cookie = naverSessionService.saveSession(request.getId(), encrypted);

        return ResponseEntity.ok().build();
    }

    @Operation(summary = "일회용 로그인 코드로 세션 갱신", description = "네이버 로그인 시 8자리 일회용 코드를 사용하여 쿠키 세션을 갱신합니다.")
    @PostMapping("/one-time-login")
    public ResponseEntity<Void> oneTimeLogin(@RequestBody OneTimeLoginRequest request) {
        naverSessionService.renewSessionWithOneTimeCode(request.getId(), request.getCode());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "암호화된 네이버 세션 조회", description = "ID에 매칭되는 네이버 세션 쿠키 정보를 복호화하여 헤더 및 응답 바디에 담아 반환합니다. 내부 시스템 토큰 인증이 필요합니다.")
    @GetMapping
    @RequireInternalAuth
    public ResponseEntity<SessionResponse> getSession(@RequestParam(name = "id", defaultValue = "default") String id) {
        NaverCafeSession session = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));

        if ("EXPIRED".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Session has expired");
        }

        String decrypted = encryptionUtils.decrypt(session.getEncryptedCookies());

        HttpHeaders headers = new HttpHeaders();
        try {
            List<Map<String, String>> cookiesList = objectMapper.readValue(decrypted,
                    new TypeReference<List<Map<String, String>>>() {
                    });
            StringBuilder cookieStr = new StringBuilder();
            for (Map<String, String> cookieMap : cookiesList) {
                String name = cookieMap.get("name");
                if (!"NID_AUT".equals(name) && !"NID_SES".equals(name)) {
                    continue;
                }
                String value = cookieMap.get("value");
                if (value != null && value.contains(";")) {
                    value = value.substring(0, value.indexOf(";")).trim();
                }
                String domain = cookieMap.get("domain");
                String path = cookieMap.get("path");

                ResponseCookie responseCookie = ResponseCookie.from(name, value)
                        .domain(domain)
                        .path(path)
                        .secure(true)
                        .httpOnly(true)
                        .build();
                headers.add(HttpHeaders.SET_COOKIE, responseCookie.toString());

                if (!cookieStr.isEmpty()) {
                    cookieStr.append("; ");
                }
                cookieStr.append(name).append("=").append(value);
            }
            headers.add("X-Naver-Cookie", cookieStr.toString());
        } catch (Exception e) {
            log.error("Failed to parse session cookies JSON for ID: {}", id, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse session cookies");
        }

        SessionResponse response = new SessionResponse();
        response.setId(session.getId());
        response.setStatus(session.getStatus());
        response.setUpdatedAt(session.getUpdatedAt());

        return ResponseEntity.ok().headers(headers).body(response);
    }

    @Operation(summary = "네이버 세션 명시적 만료 처리", description = "특정 ID의 세션을 강제로 만료 상태(EXPIRED)로 변경합니다. 내부 시스템 토큰 인증이 필요합니다.")
    @PostMapping("/expire")
    @RequireInternalAuth
    public ResponseEntity<Void> expireSession(@RequestParam(name = "id", defaultValue = "default") String id) {
        NaverCafeSession session = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));
        session.markExpired(OffsetDateTime.now(ZoneOffset.UTC));
        repository.save(session);
        log.warn("Naver Cafe Session marked as EXPIRED: {}", id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "네이버 세션 상태 동기화", description = "실제 네이버 서버와 세션 상태를 검사하여 DB를 동기화하고 알림 여부를 판단합니다.")
    @PostMapping("/sync")
    public ResponseEntity<SessionStatusResponse> syncSession(
            @RequestParam(name = "id", defaultValue = "default") String id) {
        try {
            NaverCafeSession sessionBefore = repository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));
            String oldStatus = sessionBefore.getStatus();
            OffsetDateTime oldUpdatedAt = sessionBefore.getUpdatedAt();

            boolean isValid = naverSessionService.syncSessionStatus(id);

            NaverCafeSession sessionAfter = repository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));
            String newStatus = sessionAfter.getStatus();

            boolean statusChanged = !oldStatus.equals(newStatus);
            boolean shouldAlert = false;

            if (statusChanged && "EXPIRED".equals(newStatus)) {
                shouldAlert = true;
                log.warn("🚨 Naver Cafe Session transitioned to EXPIRED. Triggering alert. ID: {}", id);
            } else if ("EXPIRED".equals(newStatus)) {
                // Cooldown: Alert again only if it's been EXPIRED for more than 3 hours
                if (oldUpdatedAt.isBefore(OffsetDateTime.now(ZoneOffset.UTC).minusHours(3))) {
                    shouldAlert = true;
                    log.warn("🚨 Naver Cafe Session remains EXPIRED (3h cooldown passed). Re-triggering alert. ID: {}",
                            id);

                    // Reset the 3-hour cooldown timer by updating the updatedAt timestamp
                    sessionAfter.update(sessionAfter.getEncryptedCookies(), "EXPIRED",
                            OffsetDateTime.now(ZoneOffset.UTC));
                    repository.save(sessionAfter);
                }
            }

            SessionStatusResponse response = new SessionStatusResponse();
            response.setId(sessionAfter.getId());
            response.setStatus(sessionAfter.getStatus());
            response.setUpdatedAt(sessionAfter.getUpdatedAt());
            response.setValid(isValid);
            response.setShouldAlert(shouldAlert);
            response.setRenewalToken(null);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                SessionStatusResponse response = new SessionStatusResponse();
                response.setId(id);
                response.setStatus("MISSING");
                response.setValid(false);
                return ResponseEntity.ok(response);
            }
            throw e;
        }
    }

    @Operation(summary = "네이버 세션 상태 획득", description = "특정 ID의 세션 상태(ACTIVE, EXPIRED 등)를 조회합니다.")
    @GetMapping("/status")
    public ResponseEntity<SessionStatusResponse> getSessionStatus(
            @RequestParam(name = "id", defaultValue = "default") String id) {
        NaverCafeSession session = repository.findById(id)
                .orElse(null);

        SessionStatusResponse response = new SessionStatusResponse();
        response.setId(id);
        if (session == null) {
            response.setStatus("MISSING");
            response.setValid(false);
            response.setUpdatedAt(null);
        } else {
            response.setStatus(session.getStatus());
            response.setValid("ACTIVE".equals(session.getStatus()));
            response.setUpdatedAt(session.getUpdatedAt());
        }

        return ResponseEntity.ok(response);
    }

    @Data
    public static class SessionSaveRequest {
        private String id = "default";
        private String cookiesJson;
    }

    @Data
    public static class OneTimeLoginRequest {
        private String id = "default";
        private String code;
        private String token;
    }

    @Data
    public static class SessionResponse {
        private String id;
        private String status;
        private OffsetDateTime updatedAt;
    }

    @Data
    public static class SessionStatusResponse {
        private String id;
        private String status;
        private OffsetDateTime updatedAt;
        private boolean isValid;
        private boolean shouldAlert;
        private String renewalToken;
    }
}
