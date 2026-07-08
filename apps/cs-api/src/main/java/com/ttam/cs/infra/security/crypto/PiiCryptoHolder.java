package com.ttam.cs.infra.security.crypto;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

/**
 * Hibernate({@link EncryptedStringConverter})와 Jackson({@link EncryptedFieldSerializer},
 * {@link EncryptedFieldDeserializer})은 컨버터/시리얼라이저를 리플렉션으로 직접 생성하기 때문에
 * 생성자/필드 주입을 받을 수 없다. 애플리케이션 시작 시 Spring이 관리하는 {@link PiiEncryptionUtils}
 * 인스턴스를 정적 필드에 담아두고, 그 클래스들이 이 홀더를 통해 접근한다.
 */
@Component
public class PiiCryptoHolder {

    private static PiiEncryptionUtils instance;

    public PiiCryptoHolder(PiiEncryptionUtils piiEncryptionUtils) {
        instance = piiEncryptionUtils;
    }

    @PostConstruct
    void verifyInitialized() {
        if (instance == null) {
            throw new IllegalStateException("PiiEncryptionUtils was not injected into PiiCryptoHolder.");
        }
    }

    public static PiiEncryptionUtils get() {
        if (instance == null) {
            throw new IllegalStateException(
                    "PiiCryptoHolder is not initialized yet. The Spring application context must be started first.");
        }
        return instance;
    }
}
