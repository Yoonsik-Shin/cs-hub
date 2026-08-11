package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.infra.storage.StorageService;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import org.springframework.beans.factory.annotation.Value;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class IntegrateInquiryDataUseCase {

    private final CustomerInquiryRepository repository;
    private final InquiryWorkLogRepository workLogRepository;
    private final InquiryUniqueKeyGenerator uniqueKeyGenerator;
    private final StorageService storageService;
    private final AdminMemberRepository adminMemberRepository;
    private final PiiEncryptionUtils piiEncryptionUtils;
    private final EmailThreadResolver emailThreadResolver;

    @Value("${cs.email.webmail-url:https://company.daouoffice.com/app/mail}")
    private String webmailUrl;

    @Transactional
    public void execute(String channel, List<IntegrationItem> items) {
        List<CustomerInquiry> inquiries = items.stream()
                .filter(item -> {
                    if ("EMAIL".equalsIgnoreCase(channel) && item.channelMetadata() instanceof EmailMetadata emailMeta) {
                        String fromEmail = EmailAddressUtils.extractEmailAddress(emailMeta.from());
                        if (fromEmail != null && adminMemberRepository.existsByEmail(fromEmail)) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(item -> {
                    if ("EMAIL".equalsIgnoreCase(channel)) {
                        validateEmailItem(item);
                    }

                    List<String> imageUrls = item.imageUrls();
                    if ((imageUrls == null || imageUrls.isEmpty())
                            && item.channelMetadata() instanceof com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata cafeMeta) {
                        imageUrls = cafeMeta.imageUrls();
                    }
                    List<String> relativeUrls = imageUrls != null
                            ? imageUrls.stream().map(storageService::extractObjectKey).toList()
                            : List.of();

                    ChannelMetadata resolvedMetadata = item.channelMetadata();
                    if ("EMAIL".equalsIgnoreCase(channel) && item.channelMetadata() instanceof EmailMetadata emailMeta) {
                        resolvedMetadata = new EmailMetadata(
                                emailMeta.from(),
                                emailMeta.to(),
                                emailMeta.subject(),
                                emailMeta.date(),
                                emailMeta.headers(),
                                emailMeta.attributes(),
                                resolveEmailArticleUrl(emailMeta),
                                emailMeta.customFields()
                        );
                    }

                    CustomerInquiry inquiry = CustomerInquiry.create(
                            uniqueKeyGenerator,
                            channel,
                            item.timestamp(),
                            item.userCode(),
                            resolvedMetadata,
                            item.deviceInfo(),
                            item.content(),
                            relativeUrls,
                            false);

                    emailThreadResolver.resolve(channel, resolvedMetadata).ifPresent(parentId -> {
                        inquiry.updateParentId(parentId);
                        reopenResolvedParent(parentId);
                    });

                    if (resolvedMetadata instanceof EmailMetadata emailMeta) {
                        inquiry.updateEmailSenderHash(computeEmailSenderHash(emailMeta.from()));
                    }

                    return inquiry;
                })
                .toList();

        if (inquiries.isEmpty()) {
            return;
        }
        repository.bulkInsert(inquiries);
    }

    public record IntegrationItem(
            String timestamp,
            String userCode,
            ChannelMetadata channelMetadata,
            DeviceInfo deviceInfo,
            String content,
            List<String> imageUrls) {
    }

    private void validateEmailItem(IntegrationItem item) {
        if (!(item.channelMetadata() instanceof EmailMetadata emailMeta)) {
            throw new IllegalArgumentException("EMAIL integration item requires EmailMetadata.");
        }

        if (!hasText(item.content()) && (item.imageUrls() == null || item.imageUrls().isEmpty())) {
            throw new IllegalArgumentException("Email must include text content or at least one image. uid="
                    + emailUid(emailMeta) + ", messageId=" + cleanMessageId(emailMeta.getMessageId()));
        }

        if (!hasText(cleanMessageId(emailMeta.getMessageId())) && emailUid(emailMeta) == null) {
            throw new IllegalArgumentException("Email identity is missing. Expected message-id or IMAP uid.");
        }
    }

    private String resolveEmailArticleUrl(EmailMetadata emailMeta) {
        if (hasText(emailMeta.articleUrl())) {
            return emailMeta.articleUrl();
        }

        Long uid = emailUid(emailMeta);
        if (uid != null) {
            return appendQueryParam(webmailUrl, "uid", String.valueOf(uid));
        }

        return appendQueryParam(webmailUrl, "messageId", cleanMessageId(emailMeta.getMessageId()));
    }

    private String appendQueryParam(String baseUrl, String name, String value) {
        String base = hasText(baseUrl) ? baseUrl : "https://company.daouoffice.com/app/mail";
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + name + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private void reopenResolvedParent(UUID parentId) {
        repository.findById(parentId).ifPresent(parent -> {
            if (parent.getStatus() != CustomerInquiry.Status.RESOLVED) {
                return;
            }

            CustomerInquiry.Status previousStatus = parent.getStatus();
            parent.updateStatus(CustomerInquiry.Status.OPEN, OffsetDateTime.now(ZoneOffset.UTC));
            repository.save(parent);

            InquiryWorkLog workLog = InquiryWorkLog.create(
                    parent.getId(),
                    InquiryWorkLog.ActionType.STATUS_CHANGED,
                    null,
                    "[시스템] 회신 메일 유입으로 인해 문의가 다시 오픈되었습니다.",
                    new OperatorInfo("system", "시스템", ""),
                    previousStatus,
                    CustomerInquiry.Status.OPEN);
            workLogRepository.save(workLog);
        });
    }

    private String computeEmailSenderHash(String from) {
        String normalized = EmailAddressUtils.normalizeForHash(from);
        return normalized != null ? piiEncryptionUtils.hmacHex(normalized) : null;
    }

    private Long emailUid(EmailMetadata emailMeta) {
        return emailMeta.attributes() != null ? emailMeta.attributes().uid() : null;
    }

    private String cleanMessageId(String messageId) {
        return messageId != null ? messageId.replace("<", "").replace(">", "").trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
