package com.ttam.cs.infra.security.crypto;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES/GCM 암복호화의 공통 구현. 용도별 키를 감싸는 {@link EncryptionUtils}, {@link PiiEncryptionUtils}가
 * 이 클래스를 통해 로직을 공유한다.
 */
class AesGcmCipher {
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;

    private final SecretKeySpec secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    AesGcmCipher(String secret) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length != 16 && secretBytes.length != 24 && secretBytes.length != 32) {
            throw new IllegalStateException("AES secret must be 16, 24, or 32 bytes.");
        }
        this.secretKey = new SecretKeySpec(secretBytes, "AES");
    }

    String encrypt(String plainText) throws Exception {
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        secureRandom.nextBytes(iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        byte[] combined = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
        return Base64.getEncoder().encodeToString(combined);
    }

    String decrypt(String encryptedText) throws Exception {
        byte[] combined = Base64.getDecoder().decode(encryptedText);
        if (combined.length <= GCM_IV_LENGTH_BYTES) {
            throw new IllegalArgumentException("Encrypted payload is too short for AES-GCM.");
        }
        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        byte[] encrypted = new byte[combined.length - GCM_IV_LENGTH_BYTES];
        System.arraycopy(combined, 0, iv, 0, iv.length);
        System.arraycopy(combined, iv.length, encrypted, 0, encrypted.length);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
        byte[] decrypted = cipher.doFinal(encrypted);
        return new String(decrypted, StandardCharsets.UTF_8);
    }
}
