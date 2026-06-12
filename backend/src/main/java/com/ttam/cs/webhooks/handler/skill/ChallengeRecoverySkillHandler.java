package com.ttam.cs.webhooks.handler.skill;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import com.ttam.cs.resolution.usecase.CorrectChallengeRecordUseCase;
import com.ttam.cs.resolution.usecase.CorrectChallengeRecordUseCase.Result;
import java.util.List;

import com.ttam.cs.webhooks.dto.request.KakaoChatbotSkillRequest;
import com.ttam.cs.webhooks.dto.response.KakaoChatbotSkillResponse;
import com.ttam.cs.webhooks.handler.KakaoChatbotSkillHandler;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChallengeRecoverySkillHandler implements KakaoChatbotSkillHandler {

    public static final String SKILL_NAME = "challengeRecovery";

    private final CorrectChallengeRecordUseCase correctUseCase;

    @Override
    public String getSkillName() {
        return SKILL_NAME;
    }

    @Override
    public KakaoChatbotSkillResponse execute(KakaoChatbotSkillRequest payload) {
        // 1. Web-tier Parameter Extraction
        String userCode = "unknown";
        if (payload.userRequest() != null && payload.userRequest().user() != null) {
            userCode = payload.userRequest().user().id();
        }

        String challengeId = "unknown";
        if (payload.action() != null && payload.action().params() != null) {
            Object paramVal = payload.action().params().get("challengeId");
            if (paramVal != null) {
                challengeId = paramVal.toString();
            }
        }

        log.info("📥 [ChallengeRecoverySkillHandler] Received skill request. User: {}, Challenge: {}", userCode,
                challengeId);

        // 2. Business Use Case Execution via Result Pattern
        Result result = correctUseCase.correct(userCode, challengeId);

        // 3. Map business outcomes to presentation-specific DTOs
        return switch (result) {
            case Result.Success success ->
                KakaoChatbotSkillResponse.of(List.of(
                        KakaoChatbotSkillResponse.simpleTextOutput("정상적으로 챌린지 기록 보정이 완료되었습니다! 🎉")
                ));
            case Result.AbuseSuspected(var reason) ->
                KakaoChatbotSkillResponse.of(List.of(
                        KakaoChatbotSkillResponse.simpleTextOutput(
                                String.format("어뷰징이 의심되어 즉시 반영되지 않았습니다. (사유: %s)\n관리자 확인 후 처리됩니다.", reason)
                        )
                ));
            case Result.SystemError error ->
                KakaoChatbotSkillResponse.of(List.of(
                        KakaoChatbotSkillResponse.simpleTextOutput("기록 보정 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")
                ));
        };
    }
}
