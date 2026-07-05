package com.ttam.cs.feature.inquiry.api.http.v1.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ttam.cs.feature.inquiry.usecase.AddInquiryBookmarkUseCase;
import com.ttam.cs.feature.inquiry.usecase.GetBookmarkedInquiryIdsUseCase;
import com.ttam.cs.feature.inquiry.usecase.RemoveInquiryBookmarkUseCase;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Bookmark API", description = "운영자별 고객 문의 즐겨찾기(북마크) API")
@RestController
@RequestMapping("/api/v1/inquiries")
@RequiredArgsConstructor
public class BookmarkController {

    private final GetBookmarkedInquiryIdsUseCase getBookmarkedInquiryIdsUseCase;
    private final AddInquiryBookmarkUseCase addInquiryBookmarkUseCase;
    private final RemoveInquiryBookmarkUseCase removeInquiryBookmarkUseCase;

    @Operation(summary = "즐겨찾기 문의 ID 목록 조회", description = "현재 로그인한 운영자의 즐겨찾기 등록된 모든 문의 UUID 목록을 조회합니다.")
    @GetMapping("/bookmarks")
    public ResponseEntity<List<UUID>> getBookmarks(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser) {
        return ResponseEntity.ok(getBookmarkedInquiryIdsUseCase.execute(remoteUser));
    }

    @Operation(summary = "문의 즐겨찾기 등록", description = "특정 고객 문의를 즐겨찾기에 등록합니다.")
    @PostMapping("/{inquiryId}/bookmark")
    public ResponseEntity<Void> addBookmark(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("inquiryId") UUID inquiryId) {
        if (!addInquiryBookmarkUseCase.execute(remoteUser, inquiryId)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "문의 즐겨찾기 해제", description = "특정 고객 문의를 즐겨찾기에서 해제합니다.")
    @DeleteMapping("/{inquiryId}/bookmark")
    public ResponseEntity<Void> removeBookmark(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("inquiryId") UUID inquiryId) {
        if (!removeInquiryBookmarkUseCase.execute(remoteUser, inquiryId)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }
}
