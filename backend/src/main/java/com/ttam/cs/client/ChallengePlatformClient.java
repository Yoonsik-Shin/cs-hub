package com.ttam.cs.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Client to interface with the core Challenge Platform API server.
 */
@Component
@Slf4j
public class ChallengePlatformClient {

    public void adjustRecord(String userCode, String challengeId) {
        log.info("🎯 [ChallengePlatformClient] Requesting challenge record correction for user: {}, challenge: {}", 
                userCode, challengeId);
        
        try {
            // Simulate external API call latency (I/O block)
            Thread.sleep(800);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Challenge correction api call interrupted", e);
        }

        log.info("🎯 [ChallengePlatformClient] Challenge record correction successfully completed for user: {}", userCode);
    }
}
