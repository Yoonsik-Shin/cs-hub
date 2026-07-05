package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.feature.inquiry.usecase.BookmarkUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Bookmark API", description = "운영자별 고객 문의 즐겨찾기(북마크) API")
@RestController
@RequestMapping("/api/internal/v1/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkUseCase bookmarkUseCase;

    @Operation(summary = "즐겨찾기 문의 ID 목록 조회", description = "현재 로그인한 운영자의 즐겨찾기 등록된 모든 문의 UUID 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<List<UUID>> getBookmarks(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser
    ) {
        return ResponseEntity.ok(bookmarkUseCase.getBookmarkedInquiryIds(remoteUser));
    }

    @Operation(summary = "문의 즐겨찾기 등록", description = "특정 고객 문의를 즐겨찾기에 등록합니다.")
    @PostMapping("/{inquiryId}")
    public ResponseEntity<Void> addBookmark(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("inquiryId") UUID inquiryId
    ) {
        if (!bookmarkUseCase.addBookmark(remoteUser, inquiryId)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "문의 즐겨찾기 해제", description = "특정 고객 문의를 즐겨찾기에서 해제합니다.")
    @DeleteMapping("/{inquiryId}")
    public ResponseEntity<Void> removeBookmark(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("inquiryId") UUID inquiryId
    ) {
        if (!bookmarkUseCase.removeBookmark(remoteUser, inquiryId)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }
}
