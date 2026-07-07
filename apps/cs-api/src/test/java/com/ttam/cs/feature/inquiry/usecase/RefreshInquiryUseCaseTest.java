package com.ttam.cs.feature.inquiry.usecase;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.auth.usecase.NaverSessionUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshInquiryUseCaseTest {

    @Mock
    private CustomerInquiryRepository repository;

    @Mock
    private NaverSessionUseCase naverSessionUseCase;

    @Mock
    private RestClient restClient;

    private RefreshInquiryUseCase useCase;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        useCase = new RefreshInquiryUseCase(repository, naverSessionUseCase);
        ReflectionTestUtils.setField(useCase, "restClient", restClient);
    }

    @Test
    void testRefreshInquiry_Success() throws Exception {
        // Given
        UUID inquiryId = UUID.randomUUID();
        NaverCafeMetadata.WriterInfo writer = new NaverCafeMetadata.WriterInfo("writerId", "writerNick");
        NaverCafeMetadata.MetricsInfo metrics = new NaverCafeMetadata.MetricsInfo(10, 2, 1);
        NaverCafeMetadata metadata = new NaverCafeMetadata(28580947L, 1001L, null, "http://cafe...", writer, metrics, null, List.of(), null);

        CustomerInquiry inquiry = CustomerInquiry.reconstitute(
                inquiryId,
                UUID.randomUUID(),
                "NAVER_CAFE",
                OffsetDateTime.now(ZoneOffset.UTC),
                "writerNick",
                metadata,
                null,
                "Old content",
                CustomerInquiry.Status.OPEN,
                false
        );

        when(repository.findById(inquiryId)).thenReturn(Optional.of(inquiry));
        when(naverSessionUseCase.getDecryptedCookieHeader(null)).thenReturn("NID_AUT=aut; NID_SES=ses");

        RestClient.RequestHeadersUriSpec getSpec = mock(RestClient.RequestHeadersUriSpec.class);
        RestClient.RequestHeadersSpec headerSpec = mock(RestClient.RequestHeadersSpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.get()).thenReturn(getSpec);
        when(getSpec.uri(any(String.class))).thenReturn(headerSpec);
        when(headerSpec.header(any(String.class), any(String.class))).thenReturn(headerSpec);
        when(headerSpec.retrieve()).thenReturn(responseSpec);

        String jsonResponse = """
                {
                  "result": {
                    "article": {
                      "contentHtml": "<div>Updated content</div>",
                      "content": "Updated content",
                      "readCount": 20,
                      "commentCount": 5,
                      "likeItCount": 3
                    },
                    "comments": {
                      "items": [
                        {
                          "id": 9999,
                          "content": "This is a comment",
                          "writer": {
                            "id": "commenterId",
                            "nick": "commenterNick"
                          },
                          "updateDate": 1782297600000
                        }
                      ]
                    }
                  }
                }
                """;
        JsonNode responseNode = objectMapper.readTree(jsonResponse);
        when(responseSpec.body(JsonNode.class)).thenReturn(responseNode);

        // When
        CustomerInquiry result = useCase.execute(inquiryId);

        // Then
        assertNotNull(result);
        assertEquals("Updated content", result.getContent());
        assertTrue(result.getChannelMetadata() instanceof NaverCafeMetadata);
        NaverCafeMetadata updatedMeta = (NaverCafeMetadata) result.getChannelMetadata();
        assertEquals(20, updatedMeta.metrics().readCount());
        assertEquals(5, updatedMeta.metrics().commentCount());
        assertEquals(3, updatedMeta.metrics().likeCount());
        assertEquals(1, updatedMeta.comments().size());
        assertEquals("This is a comment", updatedMeta.comments().get(0).content());
        assertEquals("commenterNick", updatedMeta.comments().get(0).writer().nickname());
        assertTrue(updatedMeta.comments().get(0).imageUrls().isEmpty());

        verify(repository, times(1)).save(inquiry);
        verify(repository, never()).bulkInsert(anyList());
    }
}
