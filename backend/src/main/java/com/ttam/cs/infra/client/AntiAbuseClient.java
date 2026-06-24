package com.ttam.cs.infra.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * Client to interface with the external Anti-Abuse detection server.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class AntiAbuseClient {

    private final RestClient restClient;

    @CircuitBreaker(name = "antiAbuseService", fallbackMethod = "checkAbusingFallback")
    @Retry(name = "antiAbuseService")
    public boolean checkAbusing(String userCode) {
        log.info("🔍 [AntiAbuseClient] Querying anti-abuse system via HTTP for user: {}", userCode);

        // 테스트용 파라미터 파싱 (userCode에 마커가 포함된 경우)
        long delay = 0;
        boolean fail = false;
        String cleanUserCode = userCode;

        if (userCode != null) {
            if (userCode.endsWith("-delay")) {
                delay = 6000; // Client Read Timeout (5s)보다 긴 지연
                cleanUserCode = userCode.replace("-delay", "");
            } else if (userCode.endsWith("-fail")) {
                fail = true;
                cleanUserCode = userCode.replace("-fail", "");
            }
        }

        String targetUrl = UriComponentsBuilder.fromHttpUrl("http://localhost:8080/api/external/mock/anti-abuse/check")
                .queryParam("userCode", cleanUserCode)
                .queryParam("delay", delay)
                .queryParam("fail", fail)
                .toUriString();

        Map<String, Object> response = restClient.get()
                .uri(targetUrl)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});

        boolean isAbusing = false;
        if (response != null && response.containsKey("abusing")) {
            isAbusing = (Boolean) response.get("abusing");
        }

        log.info("🔍 [AntiAbuseClient] Anti-abuse check result via HTTP: isAbusing={}", isAbusing);
        return isAbusing;
    }

    // Fallback method when Circuit Breaker is open or exceptions occur
    public boolean checkAbusingFallback(String userCode, Throwable throwable) {
        log.warn("🚨 [AntiAbuseClient] Fallback triggered! Reason: {} (Returning default safety check: false)",
                throwable.getMessage());
        return false;
    }
}
