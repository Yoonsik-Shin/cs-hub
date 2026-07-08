package com.ttam.cs.infra.security.crypto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;

/**
 * {@link EncryptedFieldSerializer}로 암호화된 JSON 문자열 필드를 복호화한다.
 * 마이그레이션 배치 이전의 레거시 평문 데이터도 그대로 읽을 수 있도록 관용적으로 복호화한다.
 */
public class EncryptedFieldDeserializer extends JsonDeserializer<String> {

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getValueAsString();
        if (value == null) {
            return null;
        }
        return PiiCryptoHolder.get().decryptOrPassThrough(value);
    }
}
