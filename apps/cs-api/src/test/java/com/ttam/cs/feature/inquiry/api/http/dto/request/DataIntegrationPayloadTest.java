package com.ttam.cs.feature.inquiry.api.http.dto.request;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.GoogleSheetMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DataIntegrationPayloadTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        
        // Register subtypes and registry entries manually for the unit test
        objectMapper.registerSubtypes(new NamedType(NaverCafeMetadata.class, "NAVER_CAFE"));
        objectMapper.registerSubtypes(new NamedType(GoogleSheetMetadata.class, "GOOGLE_SHEET"));
        
        ChannelMetadata.register("NAVER_CAFE", NaverCafeMetadata.class);
        ChannelMetadata.register("GOOGLE_SHEET", GoogleSheetMetadata.class);
    }

    @Test
    void testDeserialize_NaverCafeMetadata_Success() throws Exception {
        // Given
        String json = """
            {
              "channel": "NAVER_CAFE",
              "items": [
                {
                  "timestamp": "2026-06-22T13:53:30Z",
                  "userCode": "maskedId123",
                  "content": "이것은 네이버 카페 본문 테스트 내용입니다.",
                  "channelMetadata": {
                    "cafeId": 31741615,
                    "articleId": 1,
                    "menu": {
                      "id": 99,
                      "name": "자유게시판"
                    },
                    "articleUrl": "https://m.cafe.naver.com/ca-fe/web/cafes/31741615/articles/1",
                    "writer": {
                      "id": "maskedId123",
                      "nickname": "네이버카페러너"
                    },
                    "metrics": {
                      "readCount": 42,
                      "commentCount": 5,
                      "likeCount": 10
                    }
                  }
                }
              ]
            }
            """;

        // When
        DataIntegrationPayload payload = objectMapper.readValue(json, DataIntegrationPayload.class);

        // Then
        assertNotNull(payload);
        assertEquals("NAVER_CAFE", payload.channel());
        assertEquals(1, payload.items().size());

        DataIntegrationPayload.IntegrationItem item = payload.items().get(0);
        assertEquals("2026-06-22T13:53:30Z", item.timestamp());
        assertEquals("maskedId123", item.userCode());
        assertEquals("이것은 네이버 카페 본문 테스트 내용입니다.", item.content());

        assertTrue(item.channelMetadata() instanceof NaverCafeMetadata);
        NaverCafeMetadata metadata = (NaverCafeMetadata) item.channelMetadata();
        assertEquals(31741615L, metadata.cafeId());
        assertEquals(1L, metadata.articleId());
        
        assertNotNull(metadata.menu());
        assertEquals(99L, metadata.menu().id());
        assertEquals("자유게시판", metadata.menu().name());
        
        assertEquals("https://m.cafe.naver.com/ca-fe/web/cafes/31741615/articles/1", metadata.articleUrl());
        
        assertNotNull(metadata.writer());
        assertEquals("maskedId123", metadata.writer().id());
        assertEquals("네이버카페러너", metadata.writer().nickname());
        
        assertNotNull(metadata.metrics());
        assertEquals(42, metadata.metrics().readCount());
        assertEquals(5, metadata.metrics().commentCount());
        assertEquals(10, metadata.metrics().likeCount());
        
        assertEquals("31741615_1", metadata.getUniqueKey());
    }
}
