package com.ttam.cs.webhooks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.ttam.cs.webhooks.config.KakaoTimeout;
import com.ttam.cs.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.webhooks.dto.request.KakaoParameterValidationRequest;
import com.ttam.cs.webhooks.dto.response.KakaoChatbotSkillResponse;
import com.ttam.cs.webhooks.dto.response.KakaoParameterValidationResponse;
import com.ttam.cs.webhooks.handler.KakaoChatbotSkillHandler;
import com.ttam.cs.webhooks.handler.KakaoChatbotSkillHandlerRegistry;
import com.ttam.cs.webhooks.logging.WebhookLoggerService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final KakaoChatbotSkillHandlerRegistry kakaoChatbotSkillRegistry;
    private final WebhookLoggerService webhookLoggerService;

    @PostMapping("/webhooks/kakao/skills")
    @KakaoTimeout(4500)
    public ResponseEntity<KakaoChatbotSkillResponse> handleKakaoChatbotSkillWebhook(
            @Valid @RequestBody KakaoChatbotSkillRequest payload) {
        webhookLoggerService.logRequest(payload, "skill");

        String skillName = payload.action().name();

        KakaoChatbotSkillHandler handler = kakaoChatbotSkillRegistry.get(skillName);
        KakaoChatbotSkillResponse response = handler.execute(payload);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/webhooks/kakao/validation/user-code")
    public ResponseEntity<KakaoParameterValidationResponse> validateUserCode(
            @RequestBody KakaoParameterValidationRequest payload) {
        webhookLoggerService.logRequest(payload, "validation");

        log.info("📥 [WebhookController] Received user code validation request. Payload: {}", payload);

        String rawValue = null;
        if (payload.value() != null) {
            rawValue = payload.value().origin();
        }

        if (rawValue == null) {
            rawValue = "";
        }

        rawValue = rawValue.trim();

        if (rawValue.matches("^[0-9]{12}$")) {
            log.info("✅ [WebhookController] User code validation success: {}", rawValue);
            return ResponseEntity.ok(KakaoParameterValidationResponse.success(rawValue));
        } else {
            log.warn("❌ [WebhookController] User code validation failed: '{}'", rawValue);
            return ResponseEntity.ok(KakaoParameterValidationResponse.fail(
                    "런데이 유저 코드는 숫자 12자리여야 합니다. 런데이 앱의 '프로필 > 나의 정보'에서 확인 후 다시 입력해 주세요."
            ));
        }
    }
}