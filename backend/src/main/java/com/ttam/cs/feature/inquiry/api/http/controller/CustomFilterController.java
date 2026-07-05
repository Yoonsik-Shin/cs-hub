package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.feature.inquiry.domain.CustomFilter;
import com.ttam.cs.feature.inquiry.usecase.CustomFilterUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Custom Filter API", description = "운영자별 검색 필터 조건 저장 및 관리 API")
@RestController
@RequestMapping("/api/internal/v1/custom-filters")
@RequiredArgsConstructor
public class CustomFilterController {

    private final CustomFilterUseCase customFilterUseCase;

    public record SaveFilterRequest(String name, Map<String, Object> filterData) {}

    @Operation(summary = "저장된 커스텀 필터 목록 조회", description = "현재 로그인한 운영자의 저장된 모든 커스텀 필터 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<List<CustomFilter>> getCustomFilters(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser
    ) {
        return ResponseEntity.ok(customFilterUseCase.getCustomFilters(remoteUser));
    }

    @Operation(summary = "커스텀 필터 저장 및 업데이트", description = "현재 상세 검색 필터 설정을 커스텀 필터로 저장합니다. 이름이 겹치면 업데이트합니다.")
    @PostMapping("")
    public ResponseEntity<CustomFilter> saveCustomFilter(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @RequestBody SaveFilterRequest request
    ) {
        return customFilterUseCase.saveCustomFilter(remoteUser, request.name(), request.filterData())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @Operation(summary = "커스텀 필터 삭제", description = "저장된 커스텀 필터를 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomFilter(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("id") Long id
    ) {
        CustomFilterUseCase.DeleteResult result = customFilterUseCase.deleteCustomFilter(remoteUser, id);
        if (result == CustomFilterUseCase.DeleteResult.BAD_REQUEST) {
            return ResponseEntity.badRequest().build();
        }
        if (result == CustomFilterUseCase.DeleteResult.NOT_FOUND) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().build();
    }
}
