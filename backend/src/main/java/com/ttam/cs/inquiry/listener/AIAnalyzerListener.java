package com.ttam.cs.inquiry.listener;

import com.ttam.cs.config.RedisStreamConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class AIAnalyzerListener implements StreamListener<String, MapRecord<String, String, String>> {

    private final StringRedisTemplate redisTemplate;

    @Override
    public void onMessage(MapRecord<String, String, String> record) {
        try {
            // 더미 데이터 필터링
            if (record.getValue().containsKey("_init")) {
                log.info("[AI Analyzer] Skipping initialization token.");
                redisTemplate.opsForStream().acknowledge(RedisStreamConfig.STREAM_KEY, RedisStreamConfig.AI_GROUP, record.getId());
                return;
            }

            log.info("======================================================================");
            log.info("[AI Analyzer] 🤖 New event received from Redis Stream!");
            log.info("[AI Analyzer] Stream ID: {}", record.getId());
            log.info("[AI Analyzer] Inquiry ID: {}", record.getValue().get("id"));
            log.info("[AI Analyzer] Source: {}", record.getValue().get("source"));
            log.info("[AI Analyzer] Category: {}", record.getValue().get("category"));
            log.info("[AI Analyzer] Contents for AI scanning: '{}'", record.getValue().get("contents"));
            log.info("[AI Analyzer] 🧠 Performing NLP sentiment analysis and issue classification...");
            
            // 시뮬레이션 지연 (AI 모델 API 처리 시간 가정)
            Thread.sleep(500);
            
            log.info("[AI Analyzer] ✨ AI Processing complete. Sentiment: NEUTRAL. Urgency: MEDIUM.");

            // ACK 전송
            redisTemplate.opsForStream().acknowledge(
                    RedisStreamConfig.STREAM_KEY, 
                    RedisStreamConfig.AI_GROUP, 
                    record.getId()
            );
            log.info("[AI Analyzer] 💾 Acknowledged (XACK) message ID: {}", record.getId());
            log.info("======================================================================");

        } catch (Exception e) {
            log.error("[AI Analyzer] ❌ Error processing stream message ID: {}", record.getId(), e);
        }
    }
}
