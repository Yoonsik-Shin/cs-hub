package com.ttam.cs.feature.inquiry.usecase;

import com.fasterxml.jackson.databind.JsonNode;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.auth.usecase.NaverSessionUseCase;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@Slf4j
public class RefreshInquiryUseCase {

    private final CustomerInquiryRepository repository;
    private final NaverSessionUseCase naverSessionUseCase;
    private final RestClient restClient;

    public RefreshInquiryUseCase(CustomerInquiryRepository repository, NaverSessionUseCase naverSessionUseCase) {
        this.repository = repository;
        this.naverSessionUseCase = naverSessionUseCase;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(15000);

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    @Transactional
    public CustomerInquiry execute(UUID id) {
        log.info("Refreshing inquiry ID: {}", id);

        CustomerInquiry inquiry = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found"));

        if (!"NAVER_CAFE".equalsIgnoreCase(inquiry.getChannel())) {
            throw new IllegalArgumentException("Only NAVER_CAFE channel can be refreshed");
        }

        if (!(inquiry.getChannelMetadata() instanceof NaverCafeMetadata parentMeta)) {
            throw new IllegalArgumentException("Inquiry metadata is not NAVER_CAFE type");
        }

        Long cafeId = parentMeta.cafeId();
        Long articleId = parentMeta.articleId();

        // 1. Get decrypted cookie header
        String cookieHeader = naverSessionUseCase.getDecryptedCookieHeader(null);

        // 2. Fetch latest article and comments from Naver Cafe API
        String apiUrl = String.format("https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/%d/articles/%d", cafeId, articleId);
        JsonNode response;
        try {
            response = restClient.get()
                    .uri(apiUrl)
                    .header("Cookie", cookieHeader)
                    .header("User-Agent", "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36")
                    .header("Referer", "https://m.cafe.naver.com/")
                    .retrieve()
                    .body(JsonNode.class);
        } catch (Exception e) {
            log.error("Failed to call Naver Cafe API for cafeId: {}, articleId: {}", cafeId, articleId, e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Naver Cafe API call failed: " + e.getMessage(), e);
        }

        if (response == null || !response.has("result")) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invalid response from Naver Cafe API");
        }

        JsonNode resultNode = response.path("result");
        JsonNode articleNode = resultNode.path("article");

        // 3. Parse article updates
        String contentHtml = articleNode.path("contentHtml").asText("");
        String rawContent = articleNode.path("content").asText("");
        String cleanedContent = cleanHtml(contentHtml.isEmpty() ? rawContent : contentHtml);

        int readCount = articleNode.path("readCount").asInt(0);
        int commentCount = articleNode.path("commentCount").asInt(0);
        int likeCount = articleNode.path("likeItCount").asInt(0);

        // 4. Parse comments
        JsonNode commentsNode = resultNode.path("comments").path("items");
        List<NaverCafeMetadata.CommentInfo> parsedComments = new ArrayList<>();

        if (commentsNode.isArray()) {
            String parentWriterNickname = parentMeta.writer() != null ? parentMeta.writer().nickname() : null;

            for (JsonNode commentNode : commentsNode) {
                log.info("RAW COMMENT NODE: {}", commentNode.toString());
                long commentId = commentNode.path("id").asLong();
                String commentContent = commentNode.path("content").asText("");
                JsonNode writerNode = commentNode.path("writer");
                String writerId = writerNode.path("id").asText("");
                String writerNickname = writerNode.path("nick").asText("");
                long writeDateMs = commentNode.path("updateDate").asLong();

                OffsetDateTime timestamp = OffsetDateTime.ofInstant(
                        java.time.Instant.ofEpochMilli(writeDateMs),
                        java.time.ZoneOffset.UTC
                );
                String writeDateStr = timestamp.toString();

                // heuristic to identify operator: comment writer nickname differs from parent author's nickname
                boolean isOperator = parentWriterNickname != null && !parentWriterNickname.equals(writerNickname);

                List<String> commentImageUrls = new java.util.ArrayList<>();
                if (commentNode.has("image") && !commentNode.path("image").path("url").isMissingNode()) {
                    commentImageUrls.add(commentNode.path("image").path("url").asText());
                }
                if (commentNode.has("sticker") && !commentNode.path("sticker").path("url").isMissingNode()) {
                    commentImageUrls.add(commentNode.path("sticker").path("url").asText());
                }

                NaverCafeMetadata.WriterInfo commentWriter = new NaverCafeMetadata.WriterInfo(writerId, writerNickname);
                NaverCafeMetadata.CommentInfo parsedComment = new NaverCafeMetadata.CommentInfo(
                        commentId,
                        commentContent,
                        commentWriter,
                        writeDateStr,
                        isOperator,
                        commentImageUrls
                );

                parsedComments.add(parsedComment);
            }
        }

        // Reconstruct NaverCafeMetadata with updated metrics and comments list
        NaverCafeMetadata.MetricsInfo newMetrics = new NaverCafeMetadata.MetricsInfo(readCount, commentCount, likeCount);
        NaverCafeMetadata newMeta = new NaverCafeMetadata(
                parentMeta.cafeId(),
                parentMeta.articleId(),
                parentMeta.menu(),
                parentMeta.articleUrl(),
                parentMeta.writer(),
                newMetrics,
                parentMeta.imageUrls(),
                parsedComments
        );

        inquiry.updateContent(cleanedContent);
        inquiry.updateChannelMetadata(newMeta);
        inquiry.updateTimestamp(OffsetDateTime.now(ZoneOffset.UTC));
        repository.save(inquiry);

        log.info("Successfully refreshed inquiry ID: {}. Collected {} comments in metadata.", id, parsedComments.size());
        return inquiry;
    }

    private String cleanHtml(String html) {
        if (html == null) return "";
        String text = html.replaceAll("\\[\\[\\[.*?\\]\\]\\]", "");
        text = text.replaceAll("(?i)<br\\s*/?>", "\n");
        text = text.replaceAll("(?i)</p>|</div>|</h[1-6]>", "\n");
        text = text.replaceAll("<[^>]*>?", "");
        text = text.replaceAll("(?i)&nbsp;", " ");
        text = text.replaceAll("(?i)&[a-z]+;", "");
        text = text.replaceAll("[ \\t]+", " ");
        text = text.replaceAll("(?m)^\\s*$", "");
        text = text.replaceAll("\n\\s*\n+", "\n\n");
        return text.trim();
    }
}
