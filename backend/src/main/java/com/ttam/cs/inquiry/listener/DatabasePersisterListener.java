package com.ttam.cs.inquiry.listener;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.config.RedisStreamConfig;
import com.ttam.cs.inquiry.service.CustomerInquiryService;
import com.ttam.cs.inquiry.web.CustomerInquiryIngestRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Component("dbListener")
@Slf4j
@RequiredArgsConstructor
public class DatabasePersisterListener implements StreamListener<String, MapRecord<String, String, String>> {

    private final CustomerInquiryService inquiryService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(MapRecord<String, String, String> record) {
        try {
            // 더미 데이터 필터링
            if (record.getValue().containsKey("_init")) {
                log.info("[Database Persister] Skipping initialization token.");
                redisTemplate.opsForStream().acknowledge(RedisStreamConfig.STREAM_KEY, RedisStreamConfig.DATABASE_GROUP, record.getId());
                return;
            }

            log.info("======================================================================");
            log.info("[Database Persister] 💾 Async database persistence worker triggered!");
            log.info("[Database Persister] Stream ID: {}", record.getId());

            Map<String, String> valueMap = record.getValue();
            UUID id = UUID.fromString(valueMap.get("id"));

            // DTO 복원
            CustomerInquiryIngestRequest request = new CustomerInquiryIngestRequest();
            request.setId(id);
            request.setSource(valueMap.get("source"));
            request.setCategory(valueMap.get("category"));
            request.setPath(valueMap.get("path"));
            request.setUserCode(valueMap.get("userCode"));
            request.setContents(valueMap.get("contents"));
            request.setStatus(valueMap.get("status"));
            request.setAppVersion(valueMap.get("appVersion"));

            if (valueMap.get("createdAt") != null) {
                request.setCreatedAt(OffsetDateTime.parse(valueMap.get("createdAt")));
            }
            if (valueMap.get("updatedAt") != null) {
                request.setUpdatedAt(OffsetDateTime.parse(valueMap.get("updatedAt")));
            }

            // JSON 역직렬화
            if (valueMap.get("contactInfo") != null) {
                Map<String, Object> contactInfo = objectMapper.readValue(
                        valueMap.get("contactInfo"), 
                        new TypeReference<Map<String, Object>>() {}
                );
                request.setContactInfo(contactInfo);
            }
            if (valueMap.get("deviceInfo") != null) {
                Map<String, Object> deviceInfo = objectMapper.readValue(
                        valueMap.get("deviceInfo"), 
                        new TypeReference<Map<String, Object>>() {}
                );
                request.setDeviceInfo(deviceInfo);
            }

            // 비동기로 트랜잭션 DB 쓰기 동작 수행!
            log.info("[Database Persister] Writing inquiry '{}' to PostgreSQL...", id);
            inquiryService.ingest(request);
            log.info("[Database Persister] Successfully persisted to PostgreSQL.");

            // ACK 처리
            redisTemplate.opsForStream().acknowledge(
                    RedisStreamConfig.STREAM_KEY, 
                    RedisStreamConfig.DATABASE_GROUP, 
                    record.getId()
            );
            log.info("[Database Persister] 💾 Acknowledged (XACK) message ID: {}", record.getId());
            log.info("======================================================================");

        } catch (Exception e) {
            log.error("[Database Persister] ❌ Failed to asynchronously persist stream message ID: {}", record.getId(), e);
        }
    }
}
