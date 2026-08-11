package com.ttam.cs.infra.webhooks.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.ttam.cs.infra.security.RequireInternalAuth;
import com.ttam.cs.infra.webhooks.config.KakaoTimeout;
import com.ttam.cs.infra.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.infra.webhooks.dto.request.KakaoParameterValidationRequest;
import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest;
import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest.N8nWorkflowPayload;
import com.ttam.cs.infra.webhooks.dto.response.KakaoChatbotSkillResponse;
import com.ttam.cs.infra.webhooks.dto.response.KakaoParameterValidationResponse;
import com.ttam.cs.infra.webhooks.handler.kakao.KakaoChatbotSkillHandler;
import com.ttam.cs.infra.webhooks.handler.kakao.KakaoChatbotSkillHandlerRegistry;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowHandler;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowRegistry;
import com.ttam.cs.infra.webhooks.logging.WebhookLoggerService;
import com.ttam.cs.feature.inquiry.domain.service.InquiryPolicy;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Tag(name = "External Webhooks", description = "외부 시스템 연동용 웹훅 API. n8n 워크플로우 호출 및 카카오톡 챗봇 스킬 요청 등을 처리합니다.")
@RestController
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final KakaoChatbotSkillHandlerRegistry kakaoChatbotSkillRegistry;
    private final N8nWorkflowRegistry n8nWorkflowRegistry;
    private final WebhookLoggerService webhookLoggerService;

    /**
     * n8n은 동일 Docker Compose 네트워크 내부에서 호출하는 webhook입니다.
     * workflowName 값을 기준으로 실제 처리 핸들러를 분기합니다.
     */
    @Operation(summary = "n8n 워크플로우 웹훅 처리", description = "n8n 워크플로우 실행 완료 혹은 상태 변화 시 트리거되는 웹훅을 수신 및 처리합니다.")
    @PostMapping("/webhooks/n8n")
    @RequireInternalAuth
    public ResponseEntity<Void> handleN8nWebhook(@Valid @RequestBody N8nWebhookRequest request) {
        webhookLoggerService.logN8nWebhook(request, request.workflowName());

        N8nWorkflowHandler<N8nWorkflowPayload> handler = n8nWorkflowRegistry
                .get(request.workflowName());
        handler.execute(request.payload());

        return ResponseEntity.accepted().build();
    }

    /**
     * 현재 배포 방식은 LAN 내부 접근만 허용하므로 카카오 서버가 이 엔드포인트를 직접 호출할 수 없습니다.
     * LAN 운영에서는 사용하지 않는 개발/터널 테스트용 endpoint입니다.
     * 실제 카카오 연동이 필요하면 ngrok 같은 public tunnel 또는 외부 공개 배포가 필요합니다.
     *
     * endpoint 자체는 향후 외부 공개 배포를 대비해 유지합니다.
     * 로컬 테스트가 필요한 경우 ngrok 같은 임시 터널을 통해 카카오 webhook URL을 연결합니다.
     */
    @Operation(summary = "카카오톡 챗봇 스킬 웹훅 처리", description = "LAN 운영에서는 직접 호출되지 않으며, 개발/터널 테스트 또는 향후 외부 공개 배포를 위한 카카오 스킬 웹훅입니다.")
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

    /**
     * 현재 배포 방식은 LAN 내부 접근만 허용하므로 카카오 서버가 이 엔드포인트를 직접 호출할 수 없습니다.
     * LAN 운영에서는 사용하지 않는 개발/터널 테스트용 endpoint입니다.
     * 실제 카카오 연동이 필요하면 ngrok 같은 public tunnel 또는 외부 공개 배포가 필요합니다.
     *
     * endpoint 자체는 향후 외부 공개 배포를 대비해 유지합니다.
     * 로컬 테스트가 필요한 경우 ngrok 같은 임시 터널을 통해 카카오 webhook URL을 연결합니다.
     */
    @Operation(summary = "카카오 유저 코드 유효성 검증", description = "LAN 운영에서는 직접 호출되지 않으며, 개발/터널 테스트 또는 향후 외부 공개 배포를 위한 카카오 파라미터 검증 웹훅입니다.")
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

        if (rawValue.matches(InquiryPolicy.REQUIRED_USER_CODE_PATTERN)) {
            log.info("User code validation success: {}", rawValue);
            return ResponseEntity
                    .ok(KakaoParameterValidationResponse.success(rawValue));
        } else {
            log.warn("User code validation failed: '{}'", rawValue);
            return ResponseEntity.ok(KakaoParameterValidationResponse.fail(
                    InquiryPolicy.USER_CODE_MESSAGE + " 앱의 '프로필 > 나의 정보'에서 확인 후 다시 입력해 주세요."));
        }
    }
}
