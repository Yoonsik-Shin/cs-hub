package com.ttam.cs.feature.inquiry.usecase;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.entity.CustomerInquiry;
import com.ttam.cs.feature.inquiry.domain.vo.FieldModification;
import com.ttam.cs.feature.inquiry.exception.InquiryNotFoundException;
import com.ttam.cs.feature.inquiry.exception.InvalidInquiryRequestException;
import com.ttam.cs.feature.inquiry.repository.CustomerInquiryRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.infra.storage.StorageService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Component
@RequiredArgsConstructor
public class UpdateInquiryFieldsUseCase {

    private final CustomerInquiryRepository repository;
    private final InquiryWorkLogRepository workLogRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void execute(UUID inquiryId, UpdateInquiryFieldsRequest request, String ipAddress) {
        var inquiry = repository.findById(inquiryId)
                .orElseThrow(InquiryNotFoundException::new);

        List<FieldModification> modifications = new ArrayList<>();
        List<String> imagesToDelete = new ArrayList<>();
        Map<String, String> reasons = request.reasons() != null ? request.reasons() : Map.of();
        validateModificationReasons(inquiry, request, reasons);

        if (request.channel() != null && !request.channel().equals(inquiry.getChannel())) {
            String reason = requireReason(reasons, "channel", "채널");
            modifications.add(new FieldModification("channel", inquiry.getChannel(), request.channel(), reason));
            inquiry.updateChannel(request.channel());
        }

        if (request.userCode() != null) {
            String currentUserCode = inquiry.getUserCode() != null ? inquiry.getUserCode() : "";
            String newUserCode = request.userCode();
            if (!newUserCode.equals(currentUserCode)) {
                String reason = requireReason(reasons, "userCode", "유저 코드");
                modifications.add(new FieldModification("userCode", inquiry.getUserCode(), request.userCode(), reason));
                inquiry.updateUserCode(request.userCode().isEmpty() ? null : request.userCode());
            }
        }

        if (request.deviceInfo() != null) {
            boolean deviceChanged = !request.deviceInfo().equals(inquiry.getDeviceInfo());
            if (deviceChanged) {
                String reason = requireReason(reasons, "deviceInfo", "디바이스 정보");
                String beforeStr = inquiry.getDeviceInfo() != null
                        ? ("appVersion=" + inquiry.getDeviceInfo().appVersion()
                                + ", model=" + inquiry.getDeviceInfo().model()
                                + ", osVersion=" + inquiry.getDeviceInfo().osVersion())
                        : "null";
                String afterStr = "appVersion=" + request.deviceInfo().appVersion()
                        + ", model=" + request.deviceInfo().model()
                        + ", osVersion=" + request.deviceInfo().osVersion();
                modifications.add(new FieldModification("deviceInfo", beforeStr, afterStr, reason));
                inquiry.updateDeviceInfo(request.deviceInfo());
            }
        }

        if (request.content() != null && !request.content().equals(inquiry.getContent())) {
            String reason = requireReason(reasons, "content", "문의 내용");
            modifications.add(new FieldModification("content", inquiry.getContent(), request.content(), reason));
            inquiry.updateContent(request.content());
        }

        if (request.imageUrls() != null) {
            List<String> currentUrls = inquiry.getImageUrls() != null ? inquiry.getImageUrls() : List.of();
            List<String> newRelativeUrls = request.imageUrls().stream()
                    .map(storageService::extractObjectKey)
                    .toList();
            if (!newRelativeUrls.equals(currentUrls)) {
                String reason = requireReason(reasons, "imageUrls", "첨부 이미지");
                List<String> removed = currentUrls.stream()
                        .filter(url -> !newRelativeUrls.contains(url))
                        .toList();
                imagesToDelete.addAll(removed);
                modifications.add(new FieldModification("imageUrls",
                        String.valueOf(currentUrls.size()) + "개",
                        String.valueOf(newRelativeUrls.size()) + "개",
                        reason));
                inquiry.updateImageUrls(newRelativeUrls);
            }
        }

        if (request.customFields() != null) {
            if (inquiry.getChannelMetadata() == null) {
                throw new InvalidInquiryRequestException(
                        "접수 정보(channelMetadata)가 없는 문의는 임의 속성을 추가할 수 없습니다.");
            }
            Map<String, Object> currentCustomFields = inquiry.getChannelMetadata().customFields() != null
                    ? inquiry.getChannelMetadata().customFields()
                    : Map.of();
            if (!currentCustomFields.equals(request.customFields())) {
                String reason = requireReason(reasons, "customFields", "임의 속성");
                modifications.add(new FieldModification("customFields",
                        writeAsJson(currentCustomFields),
                        writeAsJson(request.customFields()),
                        reason));
                inquiry.updateChannelMetadata(inquiry.getChannelMetadata().withCustomFields(request.customFields()));
            }
        }

        if (modifications.isEmpty()) {
            return;
        }

        inquiry.updateTimestamp(OffsetDateTime.now(ZoneOffset.UTC));
        repository.save(inquiry);

        InquiryWorkLog workLog = InquiryWorkLog.createForModification(
                inquiryId,
                request.operatorInfo(),
                ipAddress,
                modifications);
        workLogRepository.save(workLog);
        deleteImagesAfterCommit(imagesToDelete);
    }

    private void validateModificationReasons(
            CustomerInquiry inquiry,
            UpdateInquiryFieldsRequest request,
            Map<String, String> reasons) {
        if (request.channel() != null && !request.channel().equals(inquiry.getChannel())) {
            requireReason(reasons, "channel", "채널");
        }
        if (request.userCode() != null) {
            String currentUserCode = inquiry.getUserCode() != null ? inquiry.getUserCode() : "";
            if (!request.userCode().equals(currentUserCode)) {
                requireReason(reasons, "userCode", "유저 코드");
            }
        }
        if (request.deviceInfo() != null && !request.deviceInfo().equals(inquiry.getDeviceInfo())) {
            requireReason(reasons, "deviceInfo", "디바이스 정보");
        }
        if (request.content() != null && !request.content().equals(inquiry.getContent())) {
            requireReason(reasons, "content", "문의 내용");
        }
        if (request.imageUrls() != null) {
            List<String> currentUrls = inquiry.getImageUrls() != null ? inquiry.getImageUrls() : List.of();
            List<String> nextUrls = request.imageUrls().stream().map(storageService::extractObjectKey).toList();
            if (!nextUrls.equals(currentUrls)) {
                requireReason(reasons, "imageUrls", "첨부 이미지");
            }
        }
        if (request.customFields() != null) {
            if (inquiry.getChannelMetadata() == null) {
                throw new InvalidInquiryRequestException(
                        "접수 정보(channelMetadata)가 없는 문의는 임의 속성을 추가할 수 없습니다.");
            }
            Map<String, Object> currentFields = inquiry.getChannelMetadata().customFields() != null
                    ? inquiry.getChannelMetadata().customFields()
                    : Map.of();
            if (!currentFields.equals(request.customFields())) {
                requireReason(reasons, "customFields", "임의 속성");
            }
        }
    }

    private void deleteImagesAfterCommit(List<String> objectKeys) {
        if (objectKeys.isEmpty()) {
            return;
        }
        Runnable deleteImages = () -> objectKeys.forEach(url -> {
            try {
                storageService.deleteObject(url);
            } catch (Exception e) {
                log.warn("MinIO 이미지 삭제 실패 (계속 진행): {}", url, e);
            }
        });

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteImages.run();
                }
            });
        } else {
            deleteImages.run();
        }
    }

    private String requireReason(Map<String, String> reasons, String key, String fieldLabel) {
        String reason = reasons.get(key);
        if (reason == null || reason.trim().isEmpty()) {
            throw new InvalidInquiryRequestException(fieldLabel + " 수정 사유를 입력해 주세요.");
        }
        return reason.trim();
    }

    private String writeAsJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }
}
