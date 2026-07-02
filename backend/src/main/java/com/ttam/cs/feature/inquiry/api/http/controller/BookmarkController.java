package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.feature.inquiry.domain.InquiryBookmark;
import com.ttam.cs.feature.inquiry.repository.InquiryBookmarkRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.ttam.cs.feature.auth.domain.AdminUser;
import com.ttam.cs.feature.inquiry.domain.InquiryWorkLog;
import com.ttam.cs.feature.inquiry.domain.OperatorInfo;
import com.ttam.cs.feature.inquiry.repository.InquiryWorkLogRepository;
import com.ttam.cs.infra.config.AdminUserProperties;

@Tag(name = "Bookmark API", description = "운영자별 고객 문의 즐겨찾기(북마크) API")
@RestController
@RequestMapping("/api/internal/v1/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final InquiryBookmarkRepository bookmarkRepository;
    private final AdminUserProperties adminUserProperties;
    private final InquiryWorkLogRepository workLogRepository;

    @Operation(summary = "즐겨찾기 문의 ID 목록 조회", description = "현재 로그인한 운영자의 즐겨찾기 등록된 모든 문의 UUID 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<List<UUID>> getBookmarks(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser
    ) {
        if (!StringUtils.hasText(remoteUser)) {
            return ResponseEntity.ok(List.of());
        }
        List<InquiryBookmark> bookmarks = bookmarkRepository.findByOperatorId(remoteUser.trim());
        List<UUID> inquiryIds = bookmarks.stream()
                .map(InquiryBookmark::getInquiryId)
                .collect(Collectors.toList());
        return ResponseEntity.ok(inquiryIds);
    }

    @Operation(summary = "문의 즐겨찾기 등록", description = "특정 고객 문의를 즐겨찾기에 등록합니다.")
    @PostMapping("/{inquiryId}")
    @Transactional
    public ResponseEntity<Void> addBookmark(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("inquiryId") UUID inquiryId
    ) {
        if (!StringUtils.hasText(remoteUser)) {
            return ResponseEntity.badRequest().build();
        }
        String operatorId = remoteUser.trim();
        if (!bookmarkRepository.existsByOperatorIdAndInquiryId(operatorId, inquiryId)) {
            bookmarkRepository.save(InquiryBookmark.create(operatorId, inquiryId));

            AdminUser adminUser = adminUserProperties.resolve(remoteUser);
            OperatorInfo operatorInfo = new OperatorInfo(adminUser.id(), adminUser.nickname(), adminUser.email());
            InquiryWorkLog workLog = InquiryWorkLog.create(
                    inquiryId,
                    InquiryWorkLog.ActionType.BOOKMARK_ADDED,
                    null,
                    null,
                    operatorInfo,
                    null,
                    null
            );
            workLogRepository.save(workLog);
        }
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "문의 즐겨찾기 해제", description = "특정 고객 문의를 즐겨찾기에서 해제합니다.")
    @DeleteMapping("/{inquiryId}")
    @Transactional
    public ResponseEntity<Void> removeBookmark(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("inquiryId") UUID inquiryId
    ) {
        if (!StringUtils.hasText(remoteUser)) {
            return ResponseEntity.badRequest().build();
        }
        String operatorId = remoteUser.trim();
        if (bookmarkRepository.existsByOperatorIdAndInquiryId(operatorId, inquiryId)) {
            bookmarkRepository.deleteByOperatorIdAndInquiryId(operatorId, inquiryId);

            AdminUser adminUser = adminUserProperties.resolve(remoteUser);
            OperatorInfo operatorInfo = new OperatorInfo(adminUser.id(), adminUser.nickname(), adminUser.email());
            InquiryWorkLog workLog = InquiryWorkLog.create(
                    inquiryId,
                    InquiryWorkLog.ActionType.BOOKMARK_REMOVED,
                    null,
                    null,
                    operatorInfo,
                    null,
                    null
            );
            workLogRepository.save(workLog);
        }
        return ResponseEntity.ok().build();
    }
}
