package com.ttam.cs.inquiry.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.config.RedisStreamConfig;
import com.ttam.cs.inquiry.domain.CustomerInquiry;
import com.ttam.cs.inquiry.web.CustomerInquiryIngestRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class CustomerInquiryEventPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // 1. API Ingest 스레드에서 직접 초고속 발행할 수 있는 메서드 (DB 쓰기 없음)
    public void publishDirectly(CustomerInquiryIngestRequest request, UUID id) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("id", id.toString());
            payload.put("source", request.getSource());
            payload.put("category", request.getCategory());
            payload.put("path", request.getPath());
            payload.put("userCode", request.getUserCode() != null ? request.getUserCode() : "");
            
            // contactInfo, deviceInfo Map 객체를 JSON 문자열로 변환하여 저장
            String contactInfoJson = request.getContactInfo() != null 
                    ? objectMapper.writeValueAsString(request.getContactInfo()) 
                    : "{}";
            String deviceInfoJson = request.getDeviceInfo() != null 
                    ? objectMapper.writeValueAsString(request.getDeviceInfo()) 
                    : "{}";
                    
            payload.put("contactInfo", contactInfoJson);
            payload.put("deviceInfo", deviceInfoJson);
            payload.put("contents", request.getContents());
            
            String status = request.getStatus() != null ? request.getStatus() : CustomerInquiry.Status.OPEN.name();
            payload.put("status", status);
            
            String now = OffsetDateTime.now(ZoneOffset.UTC).toString();
            payload.put("createdAt", request.getCreatedAt() != null ? request.getCreatedAt().toString() : now);
            payload.put("updatedAt", request.getUpdatedAt() != null ? request.getUpdatedAt().toString() : now);
            payload.put("appVersion", request.getAppVersion() != null ? request.getAppVersion() : "");

            MapRecord<String, String, String> record = StreamRecords.newRecord()
                    .in(RedisStreamConfig.STREAM_KEY)
                    .ofMap(payload);

            RecordId recordId = redisTemplate.opsForStream().add(record);
            log.info("📢 [LIGHTWEIGHT INGEST] Published directly to Redis Stream! Stream ID: {}, Inquiry ID: {}", 
                    recordId, id);

            redisTemplate.opsForStream().trim(RedisStreamConfig.STREAM_KEY, 10000L, true);

        } catch (Exception e) {
            log.error("❌ Failed to publish CustomerInquiry directly to Redis Stream", e);
        }
    }

    // 2. 엔티티 기반 발행 (기존 호환 및 비동기 워커 활용 가능)
    public void publish(CustomerInquiry inquiry) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("id", inquiry.getId().toString());
            payload.put("source", inquiry.getSource());
            payload.put("category", inquiry.getCategory());
            payload.put("path", inquiry.getPath());
            payload.put("userCode", inquiry.getUserCode() != null ? inquiry.getUserCode() : "");
            
            payload.put("contactInfo", objectMapper.writeValueAsString(inquiry.getContactInfo()));
            payload.put("deviceInfo", inquiry.getDeviceInfo() != null 
                    ? objectMapper.writeValueAsString(inquiry.getDeviceInfo()) 
                    : "{}");
            
            payload.put("contents", inquiry.getContents());
            payload.put("status", inquiry.getStatus().name());
            payload.put("createdAt", inquiry.getCreatedAt().toString());
            payload.put("updatedAt", inquiry.getUpdatedAt().toString());
            payload.put("appVersion", inquiry.getAppVersion() != null ? inquiry.getAppVersion() : "");

            MapRecord<String, String, String> record = StreamRecords.newRecord()
                    .in(RedisStreamConfig.STREAM_KEY)
                    .ofMap(payload);

            RecordId recordId = redisTemplate.opsForStream().add(record);
            log.info("📢 Published Event to Redis Stream! Key: {}, Stream ID: {}, Inquiry ID: {}", 
                    RedisStreamConfig.STREAM_KEY, recordId, inquiry.getId());

            redisTemplate.opsForStream().trim(RedisStreamConfig.STREAM_KEY, 10000L, true);

        } catch (Exception e) {
            log.error("❌ Failed to publish CustomerInquiry event to Redis Stream", e);
        }
    }
}
