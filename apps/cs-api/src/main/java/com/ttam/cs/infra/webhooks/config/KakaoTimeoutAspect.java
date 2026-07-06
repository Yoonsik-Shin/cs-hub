package com.ttam.cs.infra.webhooks.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import com.ttam.cs.infra.webhooks.dto.response.KakaoChatbotSkillResponse;

import java.util.List;
import java.util.concurrent.*;

/**
 * [AOP Aspect]
 * Intercepts methods annotated with @KakaoTimeout, executes them on virtual threads,
 * and throws a TimeoutException if execution exceeds the limit.
 */
@Aspect
@Component
@Slf4j
public class KakaoTimeoutAspect {

    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    @Around("@annotation(kakaoTimeout)")
    public Object handleTimeout(ProceedingJoinPoint joinPoint, KakaoTimeout kakaoTimeout) throws Throwable {
        long limitMs = kakaoTimeout.value();

        CompletableFuture<Object> future = CompletableFuture.supplyAsync(() -> {
            try {
                return joinPoint.proceed();
            } catch (Throwable e) {
                throw new CompletionException(e);
            }
        }, executor);

        try {
            return future.get(limitMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            log.warn("Timeout occurred after {}ms. Returning fallback response.", limitMs);
            future.cancel(true); // Attempt to interrupt execution

            // Return Kakao-friendly fallback message
            return ResponseEntity.ok(KakaoChatbotSkillResponse.of(List.of(
                    KakaoChatbotSkillResponse.simpleTextOutput("현재 문의량이 많아 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.")
            )));
        } catch (ExecutionException e) {
            // Unwrap and throw the original cause
            throw e.getCause();
        }
    }
}
