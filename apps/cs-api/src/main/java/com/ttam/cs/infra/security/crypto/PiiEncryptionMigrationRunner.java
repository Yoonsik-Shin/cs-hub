package com.ttam.cs.infra.security.crypto;

import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 평문으로 저장돼 있던 {@code customer_inquiries.content}/{@code channel_metadata}(email/phone/googleSheet 필드)를
 * 암호화하고 {@code email_sender_hash}를 채워 넣는 1회성 배치.
 *
 * <p>{@code pii.migration.enabled=true} 일 때만 애플리케이션 기동 시 실행된다. 운영 DB 백업 후 한 번 실행하고
 * 다시 false로 되돌려 둘 것. 이미 암호화된 값은 건너뛰므로 여러 번 실행해도 안전(idempotent)하다.</p>
 */
@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "pii.migration.enabled", havingValue = "true")
public class PiiEncryptionMigrationRunner implements CommandLineRunner {

    private static final int BATCH_SIZE = 200;

    private final JdbcTemplate jdbcTemplate;
    private final PiiAwareObjectMapper piiAwareObjectMapper;
    private final PiiEncryptionUtils piiEncryptionUtils;

    @Override
    public void run(String... args) {
        log.info("Starting PII encryption migration for customer_inquiries...");
        UUID lastId = new UUID(0L, 0L);
        int processed = 0;
        int updated = 0;

        while (true) {
            List<Map<String, Object>> rows = fetchBatch(lastId);
            if (rows.isEmpty()) {
                break;
            }
            for (Map<String, Object> row : rows) {
                if (migrateRow(row)) {
                    updated++;
                }
                processed++;
            }
            lastId = (UUID) rows.get(rows.size() - 1).get("id");
        }

        log.info("PII encryption migration finished. processed={}, updated={}", processed, updated);
    }

    private List<Map<String, Object>> fetchBatch(UUID lastId) {
        return jdbcTemplate.queryForList(
                "SELECT id, channel, content, channel_metadata::text AS channel_metadata, email_sender_hash " +
                        "FROM customer_inquiries WHERE id > ? ORDER BY id ASC LIMIT ?",
                lastId, BATCH_SIZE);
    }

    private boolean migrateRow(Map<String, Object> row) {
        UUID id = (UUID) row.get("id");
        String channel = (String) row.get("channel");
        String content = (String) row.get("content");
        String channelMetadataJson = (String) row.get("channel_metadata");
        String existingHash = (String) row.get("email_sender_hash");

        String newContent = migrateContent(content);
        String newChannelMetadataJson = channelMetadataJson;
        String newHash = existingHash;

        if (channelMetadataJson != null) {
            try {
                ChannelMetadata metadata = piiAwareObjectMapper.unwrap().readValue(channelMetadataJson, ChannelMetadata.class);
                newChannelMetadataJson = piiAwareObjectMapper.unwrap().writeValueAsString(metadata);

                if ("EMAIL".equalsIgnoreCase(channel) && metadata instanceof EmailMetadata emailMeta
                        && existingHash == null) {
                    String normalized = EmailAddressUtils.normalizeForHash(emailMeta.from());
                    if (normalized != null) {
                        newHash = piiEncryptionUtils.hmacHex(normalized);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to migrate channel_metadata for inquiry {}", id, e);
                return false;
            }
        }

        boolean changed = !newContent.equals(content)
                || !newChannelMetadataJson.equals(channelMetadataJson)
                || (newHash != null && !newHash.equals(existingHash));
        if (!changed) {
            return false;
        }

        jdbcTemplate.update(
                "UPDATE customer_inquiries SET content = ?, channel_metadata = ?::jsonb, email_sender_hash = ? WHERE id = ?",
                newContent, newChannelMetadataJson, newHash, id);
        return true;
    }

    private String migrateContent(String content) {
        if (content == null) {
            return null;
        }
        Optional<String> alreadyEncrypted = piiEncryptionUtils.tryDecrypt(content);
        return alreadyEncrypted.isPresent() ? content : piiEncryptionUtils.encrypt(content);
    }
}
