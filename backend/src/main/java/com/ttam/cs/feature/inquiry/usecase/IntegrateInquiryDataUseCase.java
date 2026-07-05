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

    @Transactional
    public void execute(String channel, List<IntegrationItem> items) {
        List<CustomerInquiry> inquiries = items.stream()
                .map(item -> {
                    List<String> imageUrls = item.imageUrls();
                    if ((imageUrls == null || imageUrls.isEmpty())
                            && item.channelMetadata() instanceof com.ttam.cs.feature.inquiry.domain.vo.NaverCafeMetadata cafeMeta) {
                        imageUrls = cafeMeta.imageUrls();
                    }
                    List<String> relativeUrls = imageUrls != null
                            ? imageUrls.stream().map(storageService::extractObjectKey).toList()
                            : List.of();

                    CustomerInquiry inquiry = CustomerInquiry.create(
                            uniqueKeyGenerator,
                            channel,
                            item.timestamp(),
                            item.userCode(),
                            item.channelMetadata(),
                            item.deviceInfo(),
                            item.content(),
                            relativeUrls,
                            false);

                    UUID parentId = findParentInquiryId(channel, item.channelMetadata());
                    if (parentId != null) {
                        inquiry.updateParentId(parentId);
                        reopenResolvedParent(parentId);
                    }

                    return inquiry;
                })
                .toList();

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

    private UUID findParentInquiryId(String channel, ChannelMetadata channelMetadata) {
        if (!"EMAIL".equalsIgnoreCase(channel) || !(channelMetadata instanceof EmailMetadata emailMeta)) {
            return null;
        }

        String inReplyTo = emailMeta.getInReplyTo();
        if (inReplyTo != null && !inReplyTo.isBlank()) {
            String cleanId = inReplyTo.replace("<", "").replace(">", "").trim();
            var parentOpt = repository.findEmailByMessageId(cleanId);
            if (parentOpt.isPresent()) {
                return parentOpt.get().getParentId() != null ? parentOpt.get().getParentId() : parentOpt.get().getId();
            }
        }

        String references = emailMeta.getReferences();
        if (references != null && !references.isBlank()) {
            String[] refIds = references.split("\\s+");
            for (String refId : refIds) {
                if (refId.isBlank()) {
                    continue;
                }
                String cleanRefId = refId.replace("<", "").replace(">", "").trim();
                var parentOpt = repository.findEmailByMessageId(cleanRefId);
                if (parentOpt.isPresent()) {
                    return parentOpt.get().getParentId() != null ? parentOpt.get().getParentId() : parentOpt.get().getId();
                }
            }
        }

        String subject = emailMeta.subject();
        String from = emailMeta.from();
        if (subject != null && !subject.isBlank() && from != null && !from.isBlank()) {
            String normalizedSubject = subject.replaceAll("^(?i)(re\\s*:\\s*|re\\s*:\\s*|fw\\s*:\\s*|fwd\\s*:\\s*|회신\\s*:\\s*)+", "").trim();
            String fromEmail = extractEmailAddress(from);
            if (fromEmail != null && !fromEmail.isBlank()) {
                OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
                List<CustomerInquiry> candidates = repository.findEmailCandidatesBySender(fromEmail, since);
                for (CustomerInquiry candidate : candidates) {
                    if (candidate.getChannelMetadata() instanceof EmailMetadata candMeta) {
                        String candSubject = candMeta.subject();
                        if (candSubject != null) {
                            String candNormSubject = candSubject.replaceAll("^(?i)(re\\s*:\\s*|re\\s*:\\s*|fw\\s*:\\s*|fwd\\s*:\\s*|회신\\s*:\\s*)+", "").trim();
                            if (candNormSubject.equalsIgnoreCase(normalizedSubject)) {
                                return candidate.getParentId() != null ? candidate.getParentId() : candidate.getId();
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    private String extractEmailAddress(String from) {
        if (from == null) {
            return null;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("<([^>]+)>").matcher(from);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return from.trim();
    }
}
