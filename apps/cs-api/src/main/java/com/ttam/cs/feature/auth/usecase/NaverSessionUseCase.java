package com.ttam.cs.feature.auth.usecase;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;
import com.ttam.cs.feature.auth.domain.entity.NaverCafeSession;
import com.ttam.cs.feature.auth.repository.NaverCafeSessionRepository;
import com.ttam.cs.infra.security.crypto.EncryptionUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class NaverSessionUseCase {

    private final NaverCafeSessionRepository repository;
    private final EncryptionUtils encryptionUtils;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${INTERNAL_API_TOKEN}")
    private String internalToken;

    @Value("${BROWSER_WORKER_URL:http://browser-worker:3000}")
    private String workerUrl;

    @Value("${naver.session.renew-trigger-url:}")
    private String renewTriggerUrl;

    @Value("${naver.session.id}")
    private String defaultSessionId;

    public NaverSessionUseCase(NaverCafeSessionRepository repository,
            EncryptionUtils encryptionUtils,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.encryptionUtils = encryptionUtils;
        this.objectMapper = objectMapper;

        // Configure a custom RestClient with an extended read timeout (20s) for
        // Playwright execution
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(20000);

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public String saveSession(String id, String encrypted) {
        String sessionId = normalizeSessionId(id);

        NaverCafeSession session = repository.findById(sessionId)
                .map(existing -> {
                    existing.update(encrypted, "ACTIVE", OffsetDateTime.now(ZoneOffset.UTC));
                    return existing;
                })
                .orElseGet(() -> new NaverCafeSession(
                        sessionId,
                        encrypted,
                        "ACTIVE",
                        OffsetDateTime.now(ZoneOffset.UTC)));

        repository.save(session);

        return session.getId();
    }

    @SuppressWarnings("unchecked")
    public void renewSessionWithOneTimeCode(String id, String code) {
        id = normalizeSessionId(id);
        log.info("Requesting Naver one-time login for session ID: {}, code: {}", id, code);

        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("code", code);

        try {
            ResponseEntity<Map> responseEntity = restClient.post()
                    .uri(workerUrl + "/api/naver/login/one-time")
                    .header("X-Internal-Token", internalToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(Map.class);

            Map<String, Object> body = responseEntity.getBody();
            if (body != null && Boolean.TRUE.equals(body.get("success"))) {
                List<Map<String, Object>> cookies = (List<Map<String, Object>>) body.get("cookies");

                // Filter only essential Naver session cookies: NID_AUT, NID_SES and Clean up
                // values
                List<Map<String, Object>> filteredCookies = cookies.stream()
                        .filter(cookie -> {
                            Object name = cookie.get("name");
                            return name != null && ("NID_AUT".equals(name) || "NID_SES".equals(name));
                        })
                        .map(cookie -> {
                            // restClient 응답으로 생성된 원본 Map이 불변(Immutable)일 수 있으므로 복사하여 사용
                            Map<String, Object> cleanCookie = new HashMap<>(cookie);
                            Object valueObj = cleanCookie.get("value");

                            // value 값에 세미콜론(;)이 포함되어 있다면 앞부분(순수 토큰)만 잘라서 덮어쓰기
                            if (valueObj instanceof String valueStr && valueStr.contains(";")) {
                                String cleanValue = valueStr.substring(0, valueStr.indexOf(";")).trim();
                                cleanCookie.put("value", cleanValue);
                            }

                            return cleanCookie;
                        })
                        .toList();

                String cookiesJson = objectMapper.writeValueAsString(filteredCookies);

                String encrypted = encryptionUtils.encrypt(cookiesJson);

                saveSession(id, encrypted);
                log.info("Naver Cafe Session successfully updated via one-time code. ID: {}", id);

                if (renewTriggerUrl != null && !renewTriggerUrl.trim().isEmpty()) {
                    triggerN8nWorkflowAsync();
                }
            } else {
                String reason = body != null && body.get("reason") != null ? body.get("reason").toString()
                        : "Unknown failure";
                log.error("Failed to perform Naver one-time login. Reason: {}", reason);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Naver login failed: " + reason);
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error communicating with browser-worker for one-time login", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Failed to connect to browser worker: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    public boolean syncSessionStatus(String id) {
        id = normalizeSessionId(id);
        log.info("Syncing Naver Cafe session status ID: {}", id);

        NaverCafeSession session = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));

        if ("EXPIRED".equals(session.getStatus())) {
            log.info("Session is already marked as EXPIRED in DB. Skipping worker validation during sync.");
            return false;
        }

        String decryptedCookies;
        try {
            decryptedCookies = encryptionUtils.decrypt(session.getEncryptedCookies());
        } catch (BusinessException e) {
            if (e.getErrorCode() == ErrorCode.DECRYPTION_FAILED) {
                session.markExpired(OffsetDateTime.now(ZoneOffset.UTC));
                repository.save(session);
                log.warn("Naver Cafe Session marked as EXPIRED because encrypted cookies are not GCM-compatible. ID: {}", id);
                return false;
            }
            throw e;
        }

        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("cookiesJson", decryptedCookies);

        try {
            ResponseEntity<Map> responseEntity = restClient.post()
                    .uri(workerUrl + "/api/naver/session/validate")
                    .header("X-Internal-Token", internalToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(Map.class);

            Map<String, Object> body = responseEntity.getBody();
            if (body != null && Boolean.TRUE.equals(body.get("success"))) {
                boolean isValid = Boolean.TRUE.equals(body.get("valid"));

                String newStatus = isValid ? "ACTIVE" : "EXPIRED";
                session.update(session.getEncryptedCookies(), newStatus, OffsetDateTime.now(ZoneOffset.UTC));
                repository.save(session);

                log.info("Naver Cafe Session sync result for ID: {}. Valid: {}, Status updated to: {}", id,
                        isValid, newStatus);
                return isValid;
            } else {
                String reason = body != null && body.get("reason") != null ? body.get("reason").toString()
                        : "Unknown failure";
                log.error("Failed to sync Naver session status. Reason: {}", reason);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Naver session sync failed: " + reason);
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error communicating with browser-worker for session status sync", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Failed to connect to browser worker for sync: " + e.getMessage(), e);
        }
    }

    public String normalizeSessionId(String id) {
        return id == null || id.isBlank() ? defaultSessionId : id.trim();
    }

    public String getDecryptedCookieHeader(String sessionId) {
        String id = normalizeSessionId(sessionId);
        NaverCafeSession session = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));

        if ("EXPIRED".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Session has expired");
        }

        String decrypted;
        try {
            decrypted = encryptionUtils.decrypt(session.getEncryptedCookies());
        } catch (BusinessException e) {
            session.markExpired(OffsetDateTime.now(ZoneOffset.UTC));
            repository.save(session);
            throw new ResponseStatusException(HttpStatus.GONE,
                    "Session encryption has expired. Please log in again.", e);
        }

        try {
            List<Map<String, String>> cookiesList = objectMapper.readValue(decrypted,
                    new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, String>>>() {
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

                if (!cookieStr.isEmpty()) {
                    cookieStr.append("; ");
                }
                cookieStr.append(name).append("=").append(value);
            }
            return cookieStr.toString();
        } catch (Exception e) {
            log.error("Failed to parse session cookies JSON for ID: {}", id, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse session cookies");
        }
    }

    private void triggerN8nWorkflowAsync() {
        log.info("Triggering N8n crawl workflow asynchronously at: {}", renewTriggerUrl);
        CompletableFuture.runAsync(() -> {
            try {
                restClient.post()
                        .uri(renewTriggerUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .toBodilessEntity();
                log.info("Successfully triggered N8n crawl workflow.");
            } catch (Exception e) {
                log.error("Failed to trigger N8n crawl workflow at {}", renewTriggerUrl, e);
            }
        });
    }
}
