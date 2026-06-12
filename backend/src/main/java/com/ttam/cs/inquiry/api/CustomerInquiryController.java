package com.ttam.cs.inquiry.api;

import com.ttam.cs.config.RedisStreamConfig;
import com.ttam.cs.config.RequireInternalAuth;
import com.ttam.cs.inquiry.event.CustomerInquiryEventPublisher;
import com.ttam.cs.inquiry.service.CustomerInquiryService;
import com.ttam.cs.inquiry.web.CustomerInquiryIngestRequest;
import com.ttam.cs.inquiry.web.CustomerInquiryResponseDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.ttam.cs.inquiry.domain.CustomerInquiry;
import com.ttam.cs.common.dto.CustomPageResponse;
import com.ttam.cs.inquiry.web.CustomerInquiryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/internal/v1/inquiries")
@RequiredArgsConstructor
public class CustomerInquiryController {

    private final CustomerInquiryService inquiryService;
    private final CustomerInquiryEventPublisher eventPublisher;
    private final StringRedisTemplate redisTemplate;

    @PostMapping
    @RequireInternalAuth
    public ResponseEntity<CustomerInquiryResponseDto> ingest(
            @Valid @RequestBody CustomerInquiryIngestRequest request
    ) {
        // 동기 DB 쓰기를 원천 배제하고 즉시 UUID를 할당해 Redis Stream에 이벤트를 던집니다 (나노초 응답 보장)
        UUID id = request.getId() != null ? request.getId() : UUID.randomUUID();
        eventPublisher.publishDirectly(request, id);

        CustomerInquiryResponseDto body = new CustomerInquiryResponseDto(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/search")
    public ResponseEntity<CustomPageResponse<CustomerInquiryResponse>> search(
            @RequestParam(name = "source", required = false) String source,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "status", required = false) CustomerInquiry.Status status,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam(name = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<CustomerInquiry> searchResult = inquiryService.search(source, category, status, keyword, start, end, pageable);
        Page<CustomerInquiryResponse> mapped = searchResult.map(CustomerInquiryResponse::new);
        return ResponseEntity.ok(new CustomPageResponse<>(mapped));
    }

    @GetMapping("/stream/replay")
    public ResponseEntity<List<Map<String, String>>> replayStream(
            @RequestParam(name = "fromId", defaultValue = "0-0") String fromId,
            @RequestParam(name = "count", defaultValue = "100") int count
    ) {
        // 지정 오프셋 이후의 데이터를 스트림에서 다시 읽어와 반환 (과거 메시지 재처리/추적 시연용)
        List<MapRecord<String, Object, Object>> range = redisTemplate.opsForStream().read(
                StreamOffset.create(RedisStreamConfig.STREAM_KEY, ReadOffset.from(fromId))
        );

        List<Map<String, String>> result = new ArrayList<>();
        if (range != null) {
            for (MapRecord<String, Object, Object> record : range) {
                if (result.size() >= count) {
                    break;
                }
                
                Map<String, String> item = new HashMap<>();
                item.put("_streamId", record.getId().toString());

                Map<?, ?> valueMap = record.getValue();
                if (valueMap != null) {
                    for (Map.Entry<?, ?> entry : valueMap.entrySet()) {
                        if (entry.getKey() != null && entry.getValue() != null) {
                            item.put(entry.getKey().toString(), entry.getValue().toString());
                        }
                    }
                }

                // 초기화 토큰 제거
                if (item.containsKey("_init")) {
                    continue;
                }
                result.add(item);
            }
        }
        return ResponseEntity.ok(result);
    }
}

