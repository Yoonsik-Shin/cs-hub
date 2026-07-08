package com.ttam.cs.infra.security.crypto;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 네이버 카페 세션 쿠키 전용 AES/GCM 암복호화. {@code NAVER_SESSION_SECRET} 키를 사용한다.
 * 다른 용도의 PII 암호화는 {@link PiiEncryptionUtils}를 사용할 것.
 */
@Component
@Slf4j
public class EncryptionUtils {
    private final AesGcmCipher cipher;

    public EncryptionUtils(@Value("${NAVER_SESSION_SECRET}") String secret) {
        this.cipher = new AesGcmCipher(secret);
    }

    public String encrypt(String plainText) {
        try {
            return cipher.encrypt(plainText);
        } catch (Exception e) {
            log.error("Failed to encrypt Naver session cookies", e);
            throw new BusinessException(ErrorCode.ENCRYPTION_FAILED, e);
        }
    }

    public String decrypt(String encryptedText) {
        try {
            return cipher.decrypt(encryptedText);
        } catch (Exception e) {
            log.error("Failed to decrypt Naver session cookies", e);
            throw new BusinessException(ErrorCode.DECRYPTION_FAILED, e);
        }
    }
}
