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
public class SlackNotifierListener implements StreamListener<String, MapRecord<String, String, String>> {

    private final StringRedisTemplate redisTemplate;

    @Override
    public void onMessage(MapRecord<String, String, String> record) {
        try {
            // 더미 데이터 필터링
            if (record.getValue().containsKey("_init")) {
                log.info("[Slack Notifier] Skipping initialization token.");
                redisTemplate.opsForStream().acknowledge(RedisStreamConfig.STREAM_KEY, RedisStreamConfig.SLACK_GROUP, record.getId());
                return;
            }

            log.info("======================================================================");
            log.info("[Slack Notifier] 🟢 New event received from Redis Stream!");
            log.info("[Slack Notifier] Stream ID: {}", record.getId());
            log.info("[Slack Notifier] Inquiry ID: {}", record.getValue().get("id"));
            log.info("[Slack Notifier] Source: {}", record.getValue().get("source"));
            log.info("[Slack Notifier] Category: {}", record.getValue().get("category"));
            log.info("[Slack Notifier] Path: {}", record.getValue().get("path"));
            log.info("[Slack Notifier] Contents preview: {}", record.getValue().get("contents"));
            log.info("[Slack Notifier] ⚡ Simulating Slack notification channel broadcast...");
            
            // 시뮬레이션 지연 (실제 알림 API 호출 등 비동기 처리 시간 가정)
            Thread.sleep(200);
            
            log.info("[Slack Notifier] ✅ Slack alert sent successfully.");

            // ACK 전송
            redisTemplate.opsForStream().acknowledge(
                    RedisStreamConfig.STREAM_KEY, 
                    RedisStreamConfig.SLACK_GROUP, 
                    record.getId()
            );
            log.info("[Slack Notifier] 💾 Acknowledged (XACK) message ID: {}", record.getId());
            log.info("======================================================================");

        } catch (Exception e) {
            log.error("[Slack Notifier] ❌ Error processing stream message ID: {}", record.getId(), e);
        }
    }
}
