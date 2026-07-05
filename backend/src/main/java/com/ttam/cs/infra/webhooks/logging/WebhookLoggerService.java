package com.ttam.cs.infra.webhooks.logging;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WebhookLoggerService {

    private static final int MAX_PAYLOAD_LOG_BYTES = 64 * 1024;
    private static final String MASKED_VALUE = "***MASKED***";

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "authorization",
            "cookie",
            "setcookie",
            "xinternalapitoken",
            "accesstoken",
            "refreshtoken",
            "nidaut",
            "nidses",
            "phone",
            "email"
    );

    private static final Logger serviceLogger = LoggerFactory.getLogger(WebhookLoggerService.class);
    private static final Logger kakaoSkillLogger = LoggerFactory.getLogger("com.ttam.cs.infra.webhooks.logging.KakaoSkillLogger");
    private static final Logger kakaoValidationLogger = LoggerFactory.getLogger("com.ttam.cs.infra.webhooks.logging.KakaoValidationLogger");
    private static final Logger n8nWebhookLogger = LoggerFactory.getLogger("com.ttam.cs.infra.webhooks.logging.N8nWebhookLogger");

    private final ObjectMapper objectMapper;

    public void logRequest(Object payload, String type) {
        if ("skill".equals(type)) {
            logWebhookPayload("kakao", "skill", "/webhooks/kakao/skills", payload, Map.of());
            return;
        }
        if ("validation".equals(type)) {
            logWebhookPayload("kakao", "validation", "/webhooks/kakao/validation/user-code", payload, Map.of());
        }
    }

    public void logN8nWebhook(Object payload, String workflowName) {
        logWebhookPayload("n8n", "workflow", "/webhooks/n8n", payload, Map.of("workflowName", workflowName));
    }

    public void logWebhookPayload(
            String provider,
            String type,
            String path,
            Object payload,
            Map<String, Object> attributes
    ) {
        if (payload == null) {
            return;
        }

        try {
            JsonNode maskedPayload = maskSensitiveFields(objectMapper.valueToTree(payload));
            String payloadJson = objectMapper.writeValueAsString(maskedPayload);
            int payloadSizeBytes = payloadJson.getBytes(StandardCharsets.UTF_8).length;

            Map<String, Object> event = baseEvent(provider, type, path, attributes);
            event.put("payloadSizeBytes", payloadSizeBytes);
            event.put("maxPayloadSizeBytes", MAX_PAYLOAD_LOG_BYTES);

            if (payloadSizeBytes > MAX_PAYLOAD_LOG_BYTES) {
                event.put("payloadStored", false);
                event.put("reason", "payload_too_large");
            } else {
                event.put("payloadStored", true);
                event.put("payload", maskedPayload);
            }

            loggerFor(provider, type).info("{}", objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            serviceLogger.warn("[WebhookLoggerService] Failed to serialize webhook log", e);
        }
    }

    private Map<String, Object> baseEvent(
            String provider,
            String type,
            String path,
            Map<String, Object> attributes
    ) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("timestamp", OffsetDateTime.now().toString());
        event.put("eventName", "webhook.request.received");
        event.put("provider", provider);
        event.put("type", type);
        event.put("path", path);
        event.putAll(attributes);
        return event;
    }

    private JsonNode maskSensitiveFields(JsonNode node) {
        if (node == null || node.isNull()) {
            return node;
        }

        if (node.isObject()) {
            ObjectNode objectNode = objectMapper.createObjectNode();
            node.fields().forEachRemaining(entry -> {
                String key = normalizeKey(entry.getKey());
                if (isSensitiveKey(key)) {
                    objectNode.put(entry.getKey(), MASKED_VALUE);
                } else {
                    objectNode.set(entry.getKey(), maskSensitiveFields(entry.getValue()));
                }
            });
            return objectNode;
        }

        if (node.isArray()) {
            ArrayNode arrayNode = objectMapper.createArrayNode();
            node.forEach(item -> arrayNode.add(maskSensitiveFields(item)));
            return arrayNode;
        }

        return node;
    }

    private String normalizeKey(String key) {
        return key.replace("-", "").replace("_", "").toLowerCase(Locale.ROOT);
    }

    private boolean isSensitiveKey(String normalizedKey) {
        return SENSITIVE_KEYS.contains(normalizedKey)
                || normalizedKey.contains("password")
                || normalizedKey.contains("token")
                || normalizedKey.contains("secret")
                || normalizedKey.contains("session");
    }

    private Logger loggerFor(String provider, String type) {
        if ("kakao".equals(provider) && "skill".equals(type)) {
            return kakaoSkillLogger;
        }
        if ("kakao".equals(provider) && "validation".equals(type)) {
            return kakaoValidationLogger;
        }
        if ("n8n".equals(provider)) {
            return n8nWebhookLogger;
        }
        return serviceLogger;
    }
}
