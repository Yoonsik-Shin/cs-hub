package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.feature.inquiry.domain.vo.ChannelMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.DeviceInfo;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.infra.storage.StorageService;
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
    private final AdminEmailSenderPolicy adminEmailSenderPolicy;
    private final EmailSenderHasher emailSenderHasher;
    private final EmailIntegrationValidator emailIntegrationValidator;
    private final EmailArticleUrlResolver emailArticleUrlResolver;
    private final EmailThreadResolver emailThreadResolver;
    private final ResolvedInquiryReopener resolvedInquiryReopener;

    @Transactional
    public void execute(String channel, List<IntegrationItem> items) {
        List<CustomerInquiry> inquiries = items.stream()
                .filter(item -> shouldIntegrate(channel, item))
                .map(item -> createInquiry(channel, item))
                .toList();

        if (inquiries.isEmpty()) {
            return;
        }
        repository.bulkInsert(inquiries);
    }

    private boolean shouldIntegrate(String channel, IntegrationItem item) {
        if (!"EMAIL".equalsIgnoreCase(channel)
                || !(item.channelMetadata() instanceof EmailMetadata emailMetadata)) {
            return true;
        }
        return !adminEmailSenderPolicy.isAdmin(emailMetadata.from());
    }

    private CustomerInquiry createInquiry(String channel, IntegrationItem item) {
        validate(channel, item);
        ChannelMetadata metadata = resolveMetadata(channel, item.channelMetadata());
        CustomerInquiry inquiry = CustomerInquiry.create(
                uniqueKeyGenerator,
                channel,
                item.timestamp(),
                item.userCode(),
                metadata,
                item.deviceInfo(),
                item.content(),
                resolveImageUrls(item),
                false
        );

        linkEmailThread(channel, metadata, inquiry);
        applyEmailSenderHash(metadata, inquiry);
        return inquiry;
    }

    private void validate(String channel, IntegrationItem item) {
        if ("EMAIL".equalsIgnoreCase(channel)) {
            emailIntegrationValidator.validate(item.channelMetadata(), item.content(), item.imageUrls());
        }
    }

    private ChannelMetadata resolveMetadata(String channel, ChannelMetadata metadata) {
        if ("EMAIL".equalsIgnoreCase(channel) && metadata instanceof EmailMetadata emailMetadata) {
            return emailArticleUrlResolver.resolve(emailMetadata);
        }
        return metadata;
    }

    private List<String> resolveImageUrls(IntegrationItem item) {
        List<String> imageUrls = item.imageUrls();
        if ((imageUrls == null || imageUrls.isEmpty())
                && item.channelMetadata() instanceof NaverCafeMetadata cafeMetadata) {
            imageUrls = cafeMetadata.imageUrls();
        }
        return imageUrls != null
                ? imageUrls.stream().map(storageService::extractObjectKey).toList()
                : List.of();
    }

    private void linkEmailThread(String channel, ChannelMetadata metadata, CustomerInquiry inquiry) {
        emailThreadResolver.resolve(channel, metadata).ifPresent(parentId -> {
            inquiry.updateParentId(parentId);
            resolvedInquiryReopener.reopen(parentId);
        });
    }

    private void applyEmailSenderHash(ChannelMetadata metadata, CustomerInquiry inquiry) {
        if (metadata instanceof EmailMetadata emailMetadata) {
            inquiry.updateEmailSenderHash(emailSenderHasher.hash(emailMetadata.from()));
        }
    }

    public record IntegrationItem(
            String timestamp,
            String userCode,
            ChannelMetadata channelMetadata,
            DeviceInfo deviceInfo,
            String content,
            List<String> imageUrls
    ) {
    }
}
