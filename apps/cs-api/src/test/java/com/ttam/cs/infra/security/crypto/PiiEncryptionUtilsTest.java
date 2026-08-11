package com.ttam.cs.infra.security.crypto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class PiiEncryptionUtilsTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    private final PiiEncryptionUtils encryptionUtils = new PiiEncryptionUtils(SECRET);

    @Test
    void encryptsAndDecryptsUnicodeText() {
        String plainText = "고객 문의 customer@test.com";

        String encrypted = encryptionUtils.encrypt(plainText);

        assertNotEquals(plainText, encrypted);
        assertEquals(plainText, encryptionUtils.decrypt(encrypted));
    }

    @Test
    void usesRandomInitializationVectorForEveryEncryption() {
        String first = encryptionUtils.encrypt("same-content");
        String second = encryptionUtils.encrypt("same-content");

        assertNotEquals(first, second);
        assertEquals("same-content", encryptionUtils.decrypt(first));
        assertEquals("same-content", encryptionUtils.decrypt(second));
    }

    @Test
    void rejectsCiphertextThatFailsAuthentication() {
        byte[] tampered = Base64.getDecoder().decode(encryptionUtils.encrypt("sensitive-content"));
        tampered[tampered.length - 1] ^= 1;

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> encryptionUtils.decrypt(Base64.getEncoder().encodeToString(tampered))
        );

        assertEquals(ErrorCode.PII_DECRYPTION_FAILED, exception.getErrorCode());
    }

    @Test
    void passesThroughLegacyPlaintextDuringMigration() {
        assertEquals("legacy plaintext", encryptionUtils.decryptOrPassThrough("legacy plaintext"));
    }

    @Test
    void distinguishesEncryptedValuesWithoutThrowing() {
        String encrypted = encryptionUtils.encrypt("content");

        assertEquals("content", encryptionUtils.tryDecrypt(encrypted).orElseThrow());
        assertTrue(encryptionUtils.tryDecrypt("plain text").isEmpty());
    }

    @Test
    void createsDeterministicKeyedHashWithoutExposingInput() {
        String first = encryptionUtils.hmacHex("customer@test.com");
        String second = encryptionUtils.hmacHex("customer@test.com");
        String withAnotherKey = new PiiEncryptionUtils("abcdef0123456789abcdef0123456789")
                .hmacHex("customer@test.com");

        assertEquals(first, second);
        assertNotEquals("customer@test.com", first);
        assertNotEquals(first, withAnotherKey);
        assertEquals(64, first.length());
        assertFalse(first.chars().anyMatch(Character::isUpperCase));
    }
}
