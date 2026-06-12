package com.ttam.cs.webhooks.api.advice;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.ttam.cs.webhooks.api.WebhookController;
import com.ttam.cs.webhooks.dto.response.KakaoChatbotSkillResponse;
import java.util.List;
import com.ttam.cs.webhooks.exception.NoSuchSkillHandlerException;

@RestControllerAdvice(assignableTypes = WebhookController.class)
@Slf4j
public class WebhookExceptionHandler {

    @ExceptionHandler(NoSuchSkillHandlerException.class)
    public ResponseEntity<KakaoChatbotSkillResponse> handleNoSuchSkillHandler(NoSuchSkillHandlerException ex) {
        log.warn("⚠️ [WebhookExceptionHandler] Handling exception: {}", ex.getMessage());
        return ResponseEntity.ok(KakaoChatbotSkillResponse.of(List.of(
                KakaoChatbotSkillResponse.simpleTextOutput("지원하지 않거나 준비 중인 기능입니다.")
        )));
    }
}
