package com.ttam.cs.webhooks.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WebhookLoggerService {

    private final ObjectMapper objectMapper;

    // Retrieve specific logger instances matching logback-spring.xml logger tags
    private static final Logger skillLogger = LoggerFactory.getLogger("com.ttam.cs.webhooks.logging.SkillLogger");
    private static final Logger validationLogger = LoggerFactory.getLogger("com.ttam.cs.webhooks.logging.ValidationLogger");

    /**
     * Serializes the request payload to JSON and prints it using the corresponding logger.
     */
    public void logRequest(Object payload, String type) {
        if (payload == null) {
            return;
        }
        try {
            // Serialize payload to a single-line JSON string
            String jsonContent = objectMapper.writeValueAsString(payload);

            if ("skill".equals(type)) {
                skillLogger.info("{}", jsonContent);
            } else if ("validation".equals(type)) {
                validationLogger.info("{}", jsonContent);
            }
        } catch (Exception e) {
            LoggerFactory.getLogger(WebhookLoggerService.class)
                    .error("❌ [WebhookLoggerService] Failed to serialize webhook log", e);
        }
    }
}
