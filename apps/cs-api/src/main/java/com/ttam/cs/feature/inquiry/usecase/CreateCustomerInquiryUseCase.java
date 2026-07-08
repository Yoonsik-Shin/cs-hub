package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.common.util.EmailAddressUtils;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.CreateInquiryRequest;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.service.InquiryUniqueKeyGenerator;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.infra.security.crypto.PiiEncryptionUtils;
import com.ttam.cs.infra.storage.StorageService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CreateCustomerInquiryUseCase {

    private final CustomerInquiryRepository repository;
    private final InquiryUniqueKeyGenerator uniqueKeyGenerator;
    private final StorageService storageService;
    private final PiiEncryptionUtils piiEncryptionUtils;

    @Transactional
    public UUID execute(CreateInquiryRequest request) {
        List<String> relativeUrls = request.imageUrls() != null
                ? request.imageUrls().stream().map(storageService::extractObjectKey).toList()
                : List.of();
        CustomerInquiry inquiry = CustomerInquiry.create(
                uniqueKeyGenerator,
                request.channel(),
                request.timestamp(),
                request.userCode(),
                request.channelMetadata(),
                request.deviceInfo(),
                request.content(),
                relativeUrls,
                true);

        if (request.channelMetadata() instanceof EmailMetadata emailMeta) {
            String normalized = EmailAddressUtils.normalizeForHash(emailMeta.from());
            if (normalized != null) {
                inquiry.updateEmailSenderHash(piiEncryptionUtils.hmacHex(normalized));
            }
        }

        repository.save(inquiry);
        return inquiry.getId();
    }
}
