package com.ttam.cs.infra.security.crypto;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

/**
 * {@code channel_metadata} 등 JSONB로 저장되는 record 필드 중 개인정보를 담는 문자열 필드에 붙여
 * 저장 시 AES/GCM으로 암호화한 값을 JSON에 쓴다. 짝은 {@link EncryptedFieldDeserializer}.
 */
public class EncryptedFieldSerializer extends JsonSerializer<String> {

    @Override
    public void serialize(String value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        gen.writeString(PiiCryptoHolder.get().encrypt(value));
    }
}
