package com.ttam.cs.infra.security.crypto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EncryptedStringConverterTest {

    private final EncryptedStringConverter converter = new EncryptedStringConverter();

    @BeforeEach
    void setUpCryptoHolder() {
        new PiiCryptoHolder(new PiiEncryptionUtils("0123456789abcdef0123456789abcdef"));
    }

    @Test
    void encryptsEntityFieldBeforePersistenceAndDecryptsAfterRead() {
        String databaseValue = converter.convertToDatabaseColumn("고객 문의 내용");

        assertNotEquals("고객 문의 내용", databaseValue);
        assertEquals("고객 문의 내용", converter.convertToEntityAttribute(databaseValue));
    }

    @Test
    void readsLegacyPlaintextDuringMigrationWindow() {
        assertEquals("legacy plaintext", converter.convertToEntityAttribute("legacy plaintext"));
    }

    @Test
    void preservesNullValuesAtPersistenceBoundary() {
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
    }
}
