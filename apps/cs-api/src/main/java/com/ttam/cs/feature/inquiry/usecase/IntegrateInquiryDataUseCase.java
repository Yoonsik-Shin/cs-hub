package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.infra.storage.StorageService;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class IntegrateInquiryDataUseCase {

    private final CustomerInquiryRepository repository;
    private final InquiryUniqueKeyGenerator uniqueKeyGenerator;
    private final StorageService storageService;
    private final AdminMemberRepository adminMemberRepository;
    private final PiiEncryptionUtils piiEncryptionUtils;
    private final EmailIntegrationValidator emailIntegrationValidator;
    private final EmailArticleUrlResolver emailArticleUrlResolver;
    private final EmailThreadResolver emailThreadResolver;
    private final ResolvedInquiryReopener resolvedInquiryReopener;

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
                        emailIntegrationValidator.validate(
                                item.channelMetadata(),
                                item.content(),
                                item.imageUrls()
                        );
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
                        resolvedMetadata = emailArticleUrlResolver.resolve(emailMeta);
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
                        resolvedInquiryReopener.reopen(parentId);
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

    private String computeEmailSenderHash(String from) {
        String normalized = EmailAddressUtils.normalizeForHash(from);
        return normalized != null ? piiEncryptionUtils.hmacHex(normalized) : null;
    }

}
