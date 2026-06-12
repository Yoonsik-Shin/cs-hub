package com.ttam.cs.resolution.usecase;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import com.ttam.cs.client.AntiAbuseClient;
import com.ttam.cs.client.ChallengePlatformClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class CorrectChallengeRecordUseCase {

    public sealed interface Result {
        record Success(String userCode, String challengeId) implements Result {}
        record AbuseSuspected(String reason) implements Result {}
        record SystemError(String message) implements Result {}
    }

    private final AntiAbuseClient antiAbuseClient;
    private final ChallengePlatformClient challengePlatformClient;

    /**
     * Business Use Case: Verifies abuse status and adjusts the user's challenge
     * record.
     */
    public Result correct(String userCode, String challengeId) {
        log.info("🚀 [CorrectChallengeRecordUseCase] Start workflow for user: {}, challenge: {}", userCode,
                challengeId);

        try {
            // 1. Verify if user has an abuse pattern
            boolean isAbusing = antiAbuseClient.checkAbusing(userCode);
            if (isAbusing) {
                log.warn("⚠️ [CorrectChallengeRecordUseCase] Abuse detected! Blocking correction for user: {}",
                        userCode);
                return new Result.AbuseSuspected("어뷰징 패턴 감지");
            }

            // 2. Perform challenge record adjustment
            challengePlatformClient.adjustRecord(userCode, challengeId);

            log.info("🚀 [CorrectChallengeRecordUseCase] Workflow completed successfully for user: {}", userCode);
            return new Result.Success(userCode, challengeId);

        } catch (Exception e) {
            log.error("❌ [CorrectChallengeRecordUseCase] Error during challenge record correction", e);
            return new Result.SystemError(e.getMessage());
        }
    }
}
