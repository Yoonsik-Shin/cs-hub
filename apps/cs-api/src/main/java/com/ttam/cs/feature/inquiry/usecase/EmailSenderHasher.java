package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EmailSenderHasher {

    private final PiiEncryptionUtils piiEncryptionUtils;

    public String hash(String from) {
        String normalized = EmailAddressUtils.normalizeForHash(from);
        return normalized != null ? piiEncryptionUtils.hmacHex(normalized) : null;
    }
}
