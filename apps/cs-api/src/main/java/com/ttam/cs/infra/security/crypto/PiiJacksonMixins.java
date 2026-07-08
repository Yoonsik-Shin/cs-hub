package com.ttam.cs.infra.security.crypto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

/**
 * PII 필드를 저장 시에만 암호화하기 위한 Jackson 믹스인 모음.
 *
 * <p>{@code channel_metadata}의 record 필드에 직접 {@code @JsonSerialize}를 붙이면 HTTP 응답을 만들
 * 때도 같은 어노테이션이 적용되어 API 응답까지 암호문으로 나가버린다(실제로 이 문제가 재현됨). 그래서
 * 도메인 record는 평문 그대로 두고, DB 저장 전용 {@code piiAwareObjectMapper}에만 이 믹스인을 등록해
 * "DB에 쓸 때만 암호화"를 구현한다. HTTP 응답은 기본 {@code ObjectMapper}(믹스인 없음)를 쓰므로 항상
 * 평문으로 내려간다.</p>
 */
final class PiiJacksonMixins {

    private PiiJacksonMixins() {
    }

    interface PhoneMetadataMixin {
        @JsonSerialize(using = EncryptedFieldSerializer.class)
        @JsonDeserialize(using = EncryptedFieldDeserializer.class)
        String phoneNumber();

        @JsonSerialize(using = EncryptedFieldSerializer.class)
        @JsonDeserialize(using = EncryptedFieldDeserializer.class)
        String memo();
    }

    interface GoogleSheetMetadataMixin {
        @JsonSerialize(using = EncryptedFieldSerializer.class)
        @JsonDeserialize(using = EncryptedFieldDeserializer.class)
        String contact();
    }

    interface EmailMetadataMixin {
        @JsonSerialize(using = EncryptedFieldSerializer.class)
        @JsonDeserialize(using = EncryptedFieldDeserializer.class)
        String from();
    }
}
