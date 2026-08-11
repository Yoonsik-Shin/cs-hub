package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EmailThreadResolver {

    private static final String REPLY_PREFIX_PATTERN =
            "(?i)^(re\\s*:\\s*|fw\\s*:\\s*|fwd\\s*:\\s*|회신\\s*:\\s*)+";
    private static final int SUBJECT_FALLBACK_LOOKBACK_DAYS = 7;

    private final CustomerInquiryRepository repository;
    private final PiiEncryptionUtils piiEncryptionUtils;

    public Optional<UUID> resolve(String channel, ChannelMetadata metadata) {
        if (!"EMAIL".equalsIgnoreCase(channel) || !(metadata instanceof EmailMetadata emailMetadata)) {
            return Optional.empty();
        }

        Optional<UUID> parentId = findByMessageId(emailMetadata.getInReplyTo());
        if (parentId.isPresent()) {
            return parentId;
        }

        parentId = findByReferences(emailMetadata.getReferences());
        if (parentId.isPresent()) {
            return parentId;
        }

        return findBySenderAndSubject(emailMetadata);
    }

    private Optional<UUID> findByReferences(String references) {
        if (references == null || references.isBlank()) {
            return Optional.empty();
        }

        for (String reference : references.split("\\s+")) {
            Optional<UUID> parentId = findByMessageId(reference);
            if (parentId.isPresent()) {
                return parentId;
            }
        }
        return Optional.empty();
    }

    private Optional<UUID> findByMessageId(String messageId) {
        String normalizedMessageId = normalizeMessageId(messageId);
        if (normalizedMessageId == null) {
            return Optional.empty();
        }

        return repository.findEmailByMessageId(normalizedMessageId)
                .map(this::rootIdOf);
    }

    private Optional<UUID> findBySenderAndSubject(EmailMetadata metadata) {
        String normalizedSubject = normalizeSubject(metadata.subject());
        String normalizedSender = EmailAddressUtils.normalizeForHash(metadata.from());
        if (normalizedSubject == null || normalizedSender == null) {
            return Optional.empty();
        }

        String senderHash = piiEncryptionUtils.hmacHex(normalizedSender);
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC)
                .minusDays(SUBJECT_FALLBACK_LOOKBACK_DAYS);
        List<CustomerInquiry> candidates = repository.findEmailCandidatesBySender(senderHash, since);

        return candidates.stream()
                .filter(candidate -> candidate.getChannelMetadata() instanceof EmailMetadata)
                .filter(candidate -> {
                    EmailMetadata candidateMetadata = (EmailMetadata) candidate.getChannelMetadata();
                    String candidateSubject = normalizeSubject(candidateMetadata.subject());
                    return candidateSubject != null && candidateSubject.equalsIgnoreCase(normalizedSubject);
                })
                .findFirst()
                .map(this::rootIdOf);
    }

    private UUID rootIdOf(CustomerInquiry inquiry) {
        return inquiry.getParentId() != null ? inquiry.getParentId() : inquiry.getId();
    }

    private String normalizeMessageId(String messageId) {
        if (messageId == null || messageId.isBlank()) {
            return null;
        }
        return messageId.replace("<", "").replace(">", "").trim();
    }

    private String normalizeSubject(String subject) {
        if (subject == null || subject.isBlank()) {
            return null;
        }
        return subject.replaceAll(REPLY_PREFIX_PATTERN, "").trim();
    }
}
