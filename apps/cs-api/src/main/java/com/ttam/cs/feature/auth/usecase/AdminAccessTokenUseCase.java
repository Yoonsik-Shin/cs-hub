package com.ttam.cs.feature.auth.usecase;

import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import com.ttam.cs.infra.security.AdminRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Component
public class AdminAccessTokenUseCase {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

    private final AdminMemberRepository adminMemberRepository;
    private final byte[] secret;

    public AdminAccessTokenUseCase(
            AdminMemberRepository adminMemberRepository,
            @Value("${admin.access-secret:${admin.n8n-access-secret:${INTERNAL_API_TOKEN}}}") String secret
    ) {
        this.adminMemberRepository = adminMemberRepository;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String issue(String username) {
        long expiresAt = Instant.now().getEpochSecond() + TOKEN_TTL_SECONDS;
        String payload = username + ":" + expiresAt;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8))
                + "."
                + sign(payload);
    }

    public boolean isValidAdminToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        String[] parts = token.split("\\.", 2);
        if (parts.length != 2) {
            return false;
        }

        Optional<String> payload = decode(parts[0]);
        if (payload.isEmpty() || !sign(payload.get()).equals(parts[1])) {
            return false;
        }

        String[] payloadParts = payload.get().split(":", 2);
        if (payloadParts.length != 2) {
            return false;
        }

        long expiresAt;
        try {
            expiresAt = Long.parseLong(payloadParts[1]);
        } catch (NumberFormatException e) {
            return false;
        }

        if (expiresAt < Instant.now().getEpochSecond()) {
            return false;
        }

        String username = payloadParts[0];
        return adminMemberRepository.findById(username)
                .map(member -> AdminRole.ADMIN.name().equals(member.getRole()))
                .orElse(false);
    }

    private Optional<String> decode(String encodedPayload) {
        try {
            return Optional.of(new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign admin access token", e);
        }
    }
}
