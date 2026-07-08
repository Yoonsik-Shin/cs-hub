package com.ttam.cs.infra.security.crypto;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;

/**
 * 고객 개인정보(문의 본문, 전화번호, 이메일 등) 저장 시 사용하는 AES/GCM 암복호화.
 * {@code PII_ENCRYPTION_SECRET} 키를 사용하며, 네이버 세션 키({@link EncryptionUtils})와는 분리되어 있다.
 */
@Component
@Slf4j
public class PiiEncryptionUtils {
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final AesGcmCipher cipher;
    private final SecretKeySpec hmacKey;

    public PiiEncryptionUtils(@Value("${PII_ENCRYPTION_SECRET}") String secret) {
        this.cipher = new AesGcmCipher(secret);
        this.hmacKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
    }

    public String encrypt(String plainText) {
        try {
            return cipher.encrypt(plainText);
        } catch (Exception e) {
            log.error("Failed to encrypt PII field", e);
            throw new BusinessException(ErrorCode.PII_ENCRYPTION_FAILED, e);
        }
    }

    public String decrypt(String encryptedText) {
        try {
            return cipher.decrypt(encryptedText);
        } catch (Exception e) {
            log.error("Failed to decrypt PII field", e);
            throw new BusinessException(ErrorCode.PII_DECRYPTION_FAILED, e);
        }
    }

    /**
     * 마이그레이션 배치가 아직 돌지 않아 평문으로 남아있는 레거시 데이터를 위한 관용적 복호화.
     * 복호화에 실패하면(=암호문이 아니라 평문) 원본 문자열을 그대로 반환한다.
     */
    public String decryptOrPassThrough(String value) {
        try {
            return cipher.decrypt(value);
        } catch (Exception e) {
            log.warn("PII field is not encrypted ciphertext, treating as legacy plaintext");
            return value;
        }
    }

    /**
     * 이미 암호문인지 확인할 때 사용. 평문이면 빈 값을 반환한다(예외를 로그로 남기지 않는다).
     * 마이그레이션 배치에서 "이미 암호화된 행은 건너뛴다"를 판단하는 용도.
     */
    public Optional<String> tryDecrypt(String value) {
        try {
            return Optional.of(cipher.decrypt(value));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * 정확일치 검색이 필요한 PII 값(예: 이메일 발신자)을 위한 HMAC-SHA256 해시.
     * 같은 입력은 항상 같은 해시를 내므로 원문을 노출하지 않고 등치 비교(WHERE = )에 사용할 수 있다.
     */
    public String hmacHex(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(hmacKey);
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            log.error("Failed to compute HMAC for PII field", e);
            throw new BusinessException(ErrorCode.PII_ENCRYPTION_FAILED, e);
        }
    }
}
