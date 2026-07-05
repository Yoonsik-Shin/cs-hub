package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.auth.usecase.AdminUserResolver;
import com.ttam.cs.feature.auth.usecase.dto.CurrentAdminUser;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.InquiryBookmarkRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class RemoveInquiryBookmarkUseCase {

    private final InquiryBookmarkRepository bookmarkRepository;
    private final AdminUserResolver adminUserResolver;
    private final InquiryWorkLogRepository workLogRepository;

    @Transactional
    public boolean execute(String remoteUser, UUID inquiryId) {
        if (!StringUtils.hasText(remoteUser)) {
            return false;
        }
        String operatorId = remoteUser.trim();
        if (bookmarkRepository.existsByOperatorIdAndInquiryId(operatorId, inquiryId)) {
            bookmarkRepository.deleteByOperatorIdAndInquiryId(operatorId, inquiryId);
            saveWorkLog(remoteUser, inquiryId);
        }
        return true;
    }

    private void saveWorkLog(String remoteUser, UUID inquiryId) {
        CurrentAdminUser adminUser = adminUserResolver.resolve(remoteUser);
        OperatorInfo operatorInfo = new OperatorInfo(adminUser.id(), adminUser.nickname(), adminUser.email());
        InquiryWorkLog workLog = InquiryWorkLog.create(
                inquiryId,
                InquiryWorkLog.ActionType.BOOKMARK_REMOVED,
                null,
                null,
                operatorInfo,
                null,
                null);
        workLogRepository.save(workLog);
    }
}
