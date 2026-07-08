package com.ttam.cs.infra.security.crypto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.feature.inquiry.config.ChannelMetadataSubtypeRegistrar;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 평문으로 저장돼 있던 {@code customer_inquiries.content}/{@code channel_metadata}(email/phone/googleSheet 필드)를
 * 암호화하고 {@code email_sender_hash}를 채워 넣는 1회성 CLI 도구.
 *
 * <p>애플리케이션(cs-api) 기동 경로와는 완전히 분리되어 있다 — Spring 컨텍스트를 띄우지 않고 이 클래스의
 * {@code main()}만 직접 실행한다. 운영 DB 백업 후 한 번 실행할 것.</p>
 *
 * <p>여러 번 실행해도 데이터가 깨지지는 않는다({@code content}는 이미 암호문이면 그대로 스킵). 다만
 * {@code channel_metadata}는 AES-GCM 특성상(매번 랜덤 IV) 재실행할 때마다 평문이 같아도 다른 암호문으로
 * 다시 쓰여진다 — 완전한 no-op은 아니지만 안전하며, 어차피 1회성으로 실행하고 끝낼 도구이므로 문제되지 않는다.</p>
 *
 * <p>실행 방법: {@code ./gradlew piiEncryptionMigration} (apps/cs-api 기준), 아래 환경변수가 필요하다.
 * <ul>
 *   <li>{@code DB_URL}, {@code DB_USERNAME}, {@code DB_PASSWORD} — docker-compose 밖(호스트)에서 실행한다면
 *       {@code DB_URL}의 호스트를 {@code postgres-db} 대신 {@code localhost}로 바꿔야 한다
 *       (5432 포트가 호스트에 노출돼 있음).</li>
 *   <li>{@code PII_ENCRYPTION_SECRET} — 운영 중인 cs-api와 반드시 동일한 값이어야 복호화가 가능하다.</li>
 * </ul>
 * </p>
 */
public final class PiiEncryptionMigrationTool {

    private static final int BATCH_SIZE = 200;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper piiAwareObjectMapper;
    private final PiiEncryptionUtils piiEncryptionUtils;

    private PiiEncryptionMigrationTool(JdbcTemplate jdbcTemplate, ObjectMapper piiAwareObjectMapper,
            PiiEncryptionUtils piiEncryptionUtils) {
        this.jdbcTemplate = jdbcTemplate;
        this.piiAwareObjectMapper = piiAwareObjectMapper;
        this.piiEncryptionUtils = piiEncryptionUtils;
    }

    public static void main(String[] args) {
        String dbUrl = requireEnv("DB_URL");
        String dbUsername = requireEnv("DB_USERNAME");
        String dbPassword = requireEnv("DB_PASSWORD");
        String piiSecret = requireEnv("PII_ENCRYPTION_SECRET");

        DriverManagerDataSource dataSource = new DriverManagerDataSource(dbUrl, dbUsername, dbPassword);
        dataSource.setDriverClassName("org.postgresql.Driver");
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

        ObjectMapper piiAwareObjectMapper = Jackson2ObjectMapperBuilder.json().build();
        piiAwareObjectMapper.addMixIn(com.ttam.cs.feature.inquiry.domain.vo.PhoneMetadata.class,
                PiiJacksonMixins.PhoneMetadataMixin.class);
        piiAwareObjectMapper.addMixIn(com.ttam.cs.feature.inquiry.domain.vo.GoogleSheetMetadata.class,
                PiiJacksonMixins.GoogleSheetMetadataMixin.class);
        piiAwareObjectMapper.addMixIn(EmailMetadata.class, PiiJacksonMixins.EmailMetadataMixin.class);
        ChannelMetadataSubtypeRegistrar.registerAll(piiAwareObjectMapper);

        PiiEncryptionUtils piiEncryptionUtils = new PiiEncryptionUtils(piiSecret);
        // EncryptedFieldSerializer/Deserializer(channel_metadata 필드용)는 Jackson이 리플렉션으로 직접
        // 생성하므로 Spring 없이도 PiiCryptoHolder를 수동으로 채워줘야 한다.
        new PiiCryptoHolder(piiEncryptionUtils);

        new PiiEncryptionMigrationTool(jdbcTemplate, piiAwareObjectMapper, piiEncryptionUtils).run();
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Required environment variable is missing: " + name);
        }
        return value;
    }

    private void run() {
        System.out.println("Starting PII encryption migration for customer_inquiries...");
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

        System.out.printf("PII encryption migration finished. processed=%d, updated=%d%n", processed, updated);
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
                ChannelMetadata metadata = piiAwareObjectMapper.readValue(channelMetadataJson, ChannelMetadata.class);
                newChannelMetadataJson = piiAwareObjectMapper.writeValueAsString(metadata);

                if ("EMAIL".equalsIgnoreCase(channel) && metadata instanceof EmailMetadata emailMeta
                        && existingHash == null) {
                    String normalized = EmailAddressUtils.normalizeForHash(emailMeta.from());
                    if (normalized != null) {
                        newHash = piiEncryptionUtils.hmacHex(normalized);
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to migrate channel_metadata for inquiry " + id + ": " + e);
                return false;
            }
        }

        boolean changed = !java.util.Objects.equals(newContent, content)
                || !java.util.Objects.equals(newChannelMetadataJson, channelMetadataJson)
                || !java.util.Objects.equals(newHash, existingHash);
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
