package com.ttam.cs.infra.webhooks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.ttam.cs.infra.webhooks.config.KakaoTimeout;
import com.ttam.cs.infra.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.infra.webhooks.dto.request.KakaoParameterValidationRequest;
import com.ttam.cs.infra.webhooks.dto.response.KakaoChatbotSkillResponse;
import com.ttam.cs.infra.webhooks.dto.response.KakaoParameterValidationResponse;
import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest;
import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest.N8nWorkflowPayload;
import com.ttam.cs.infra.webhooks.handler.kakao.KakaoChatbotSkillHandler;
import com.ttam.cs.infra.webhooks.handler.kakao.KakaoChatbotSkillHandlerRegistry;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowHandler;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowRegistry;
import com.ttam.cs.infra.webhooks.logging.WebhookLoggerService;
import com.ttam.cs.infra.security.RequireInternalAuth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "External Webhooks", description = "외부 시스템 연동용 웹훅 API. n8n 워크플로우 호출 및 카카오톡 챗봇 스킬 요청 등을 처리합니다.")
@RestController
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final KakaoChatbotSkillHandlerRegistry kakaoChatbotSkillRegistry;
    private final N8nWorkflowRegistry n8nWorkflowRegistry;
    private final WebhookLoggerService webhookLoggerService;

    @Operation(summary = "n8n 워크플로우 웹훅 처리", description = "n8n 워크플로우 실행 완료 혹은 상태 변화 시 트리거되는 웹훅을 수신 및 처리합니다.")
    @PostMapping("/webhooks/n8n")
    @RequireInternalAuth
    public ResponseEntity<Void> handleN8nWebhook(@Valid @RequestBody N8nWebhookRequest request) {
        log.info("Received n8n webhook request: workflow={}",
                request.workflowName());

        String workflowName = request.workflowName();

        N8nWorkflowHandler<N8nWorkflowPayload> handler = n8nWorkflowRegistry
                .get(workflowName);
        handler.execute(request.payload());

        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "카카오톡 챗봇 스킬 웹훅 처리", description = "카카오톡 챗봇에서 스킬 호출 시 응답을 가공하여 전달하는 핸들러입니다.")
    @PostMapping("/webhooks/kakao/skills")
    @KakaoTimeout(4500)
    public ResponseEntity<KakaoChatbotSkillResponse> handleKakaoChatbotSkillWebhook(
            @Valid @RequestBody KakaoChatbotSkillRequest request) {
        webhookLoggerService.logRequest(request, "skill");

        String skillName = request.action().name();

        KakaoChatbotSkillHandler handler = kakaoChatbotSkillRegistry
                .get(skillName);
        KakaoChatbotSkillResponse response = handler.execute(request);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "카카오 유저 코드 유효성 검증", description = "입력받은 사용자 코드가 12자리 숫자인지 포맷 유효성 검증을 수행합니다.")
    @PostMapping("/webhooks/kakao/validation/user-code")
    public ResponseEntity<KakaoParameterValidationResponse> validateUserCode(
            @RequestBody KakaoParameterValidationRequest request) {
        webhookLoggerService.logRequest(request, "validation");

        log.info("Received user code validation request. Payload: {}", request);

        String rawValue = null;
        if (request.value() != null) {
            rawValue = request.value().origin();
        }

        if (rawValue == null) {
            rawValue = "";
        }

        rawValue = rawValue.trim();

        if (rawValue.matches("^[0-9]{12}$")) {
            log.info("User code validation success: {}", rawValue);
            return ResponseEntity
                    .ok(KakaoParameterValidationResponse.success(rawValue));
        } else {
            log.warn("User code validation failed: '{}'", rawValue);
            return ResponseEntity.ok(KakaoParameterValidationResponse.fail(
                    "유저 코드는 숫자 12자리여야 합니다. 앱의 '프로필 > 나의 정보'에서 확인 후 다시 입력해 주세요."));
        }
    }
}
