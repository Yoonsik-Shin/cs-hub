package com.ttam.cs.feature.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.feature.auth.domain.NaverCafeSession;
import com.ttam.cs.feature.auth.repo.NaverCafeSessionRepository;
import com.ttam.cs.common.util.EncryptionUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class NaverSessionService {

    private final NaverCafeSessionRepository repository;
    private final EncryptionUtils encryptionUtils;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${INTERNAL_API_TOKEN:changeme}")
    private String internalToken;

    @Value("${BROWSER_WORKER_URL:http://browser-worker:3000}")
    private String workerUrl;

    @Value("${naver.session.renew-trigger-url:}")
    private String renewTriggerUrl;

    public NaverSessionService(NaverCafeSessionRepository repository,
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
        NaverCafeSession session = repository.findById(id)
                .map(existing -> {
                    existing.update(encrypted, "ACTIVE", OffsetDateTime.now(ZoneOffset.UTC));
                    return existing;
                })
                .orElseGet(() -> new NaverCafeSession(
                        id,
                        encrypted,
                        "ACTIVE",
                        OffsetDateTime.now(ZoneOffset.UTC)));

        repository.save(session);

        return session.getId();
    }

    @SuppressWarnings("unchecked")
    public void renewSessionWithOneTimeCode(String id, String code) {
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

                // Filter only essential Naver session cookies: NID_AUT, NID_SES
                List<Map<String, Object>> filteredCookies = cookies.stream()
                        .filter(cookie -> {
                            Object name = cookie.get("name");
                            return name != null && ("NID_AUT".equals(name) || "NID_SES".equals(name));
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
    public boolean validateSession(String id) {
        log.info("Validating Naver Cafe session ID: {}", id);

        NaverCafeSession session = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Naver session not found"));

        if ("EXPIRED".equals(session.getStatus())) {
            log.info("Session is already marked as EXPIRED in DB. Skipping worker validation.");
            return false;
        }

        String decryptedCookies = encryptionUtils.decrypt(session.getEncryptedCookies());

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

                log.info("Naver Cafe Session validation result for ID: {}. Valid: {}, Status updated to: {}", id,
                        isValid, newStatus);
                return isValid;
            } else {
                String reason = body != null && body.get("reason") != null ? body.get("reason").toString()
                        : "Unknown failure";
                log.error("Failed to validate Naver session. Reason: {}", reason);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Naver session validation failed: " + reason);
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error communicating with browser-worker for session validation", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Failed to connect to browser worker for validation: " + e.getMessage(), e);
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
