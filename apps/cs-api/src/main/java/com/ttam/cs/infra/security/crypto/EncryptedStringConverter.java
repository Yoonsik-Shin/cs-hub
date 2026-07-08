package com.ttam.cs.infra.security.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * 엔티티의 문자열 컬럼을 저장 시 AES/GCM으로 암호화하고 조회 시 복호화하는 JPA 컨버터.
 * {@code autoApply = false}이므로 암호화가 필요한 필드에 {@code @Convert}로 명시적으로 붙여야 한다.
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return PiiCryptoHolder.get().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        return PiiCryptoHolder.get().decryptOrPassThrough(dbData);
    }
}
