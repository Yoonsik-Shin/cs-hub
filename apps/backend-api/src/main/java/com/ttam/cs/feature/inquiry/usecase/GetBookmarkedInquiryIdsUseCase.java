package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.entity.InquiryBookmark;
import com.ttam.cs.feature.inquiry.repository.InquiryBookmarkRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class GetBookmarkedInquiryIdsUseCase {

    private final InquiryBookmarkRepository bookmarkRepository;

    @Transactional(readOnly = true)
    public List<UUID> execute(String remoteUser) {
        if (!StringUtils.hasText(remoteUser)) {
            return List.of();
        }
        return bookmarkRepository.findByOperatorId(remoteUser.trim()).stream()
                .map(InquiryBookmark::getInquiryId)
                .toList();
    }
}
