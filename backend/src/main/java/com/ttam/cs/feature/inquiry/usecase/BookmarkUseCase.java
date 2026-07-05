package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.auth.usecase.AdminUserResolver;
import com.ttam.cs.feature.auth.usecase.dto.CurrentAdminUser;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryBookmark;
import com.ttam.cs.feature.inquiry.domain.entity.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.InquiryBookmarkRepository;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class BookmarkUseCase {
    private final InquiryBookmarkRepository bookmarkRepository;
    private final AdminUserResolver adminUserResolver;
    private final InquiryWorkLogRepository workLogRepository;

    @Transactional(readOnly = true)
    public List<UUID> getBookmarkedInquiryIds(String remoteUser) {
        if (!StringUtils.hasText(remoteUser)) {
            return List.of();
        }
        return bookmarkRepository.findByOperatorId(remoteUser.trim()).stream()
                .map(InquiryBookmark::getInquiryId)
                .toList();
    }

    @Transactional
    public boolean addBookmark(String remoteUser, UUID inquiryId) {
        if (!StringUtils.hasText(remoteUser)) {
            return false;
        }
        String operatorId = remoteUser.trim();
        if (!bookmarkRepository.existsByOperatorIdAndInquiryId(operatorId, inquiryId)) {
            bookmarkRepository.save(InquiryBookmark.create(operatorId, inquiryId));
            saveWorkLog(remoteUser, inquiryId, InquiryWorkLog.ActionType.BOOKMARK_ADDED);
        }
        return true;
    }

    @Transactional
    public boolean removeBookmark(String remoteUser, UUID inquiryId) {
        if (!StringUtils.hasText(remoteUser)) {
            return false;
        }
        String operatorId = remoteUser.trim();
        if (bookmarkRepository.existsByOperatorIdAndInquiryId(operatorId, inquiryId)) {
            bookmarkRepository.deleteByOperatorIdAndInquiryId(operatorId, inquiryId);
            saveWorkLog(remoteUser, inquiryId, InquiryWorkLog.ActionType.BOOKMARK_REMOVED);
        }
        return true;
    }

    private void saveWorkLog(String remoteUser, UUID inquiryId, InquiryWorkLog.ActionType actionType) {
        CurrentAdminUser adminUser = adminUserResolver.resolve(remoteUser);
        OperatorInfo operatorInfo = new OperatorInfo(adminUser.id(), adminUser.nickname(), adminUser.email());
        InquiryWorkLog workLog = InquiryWorkLog.create(
                inquiryId,
                actionType,
                null,
                null,
                operatorInfo,
                null,
                null
        );
        workLogRepository.save(workLog);
    }
}
