package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.feature.inquiry.domain.CustomFilter;
import com.ttam.cs.feature.inquiry.repository.CustomFilterRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Tag(name = "Custom Filter API", description = "운영자별 검색 필터 조건 저장 및 관리 API")
@RestController
@RequestMapping("/api/internal/v1/custom-filters")
@RequiredArgsConstructor
public class CustomFilterController {

    private final CustomFilterRepository customFilterRepository;

    public record SaveFilterRequest(String name, Map<String, Object> filterData) {}

    @Operation(summary = "저장된 커스텀 필터 목록 조회", description = "현재 로그인한 운영자의 저장된 모든 커스텀 필터 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<List<CustomFilter>> getCustomFilters(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser
    ) {
        if (!StringUtils.hasText(remoteUser)) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(customFilterRepository.findByOperatorIdOrderByIdDesc(remoteUser.trim()));
    }

    @Operation(summary = "커스텀 필터 저장 및 업데이트", description = "현재 상세 검색 필터 설정을 커스텀 필터로 저장합니다. 이름이 겹치면 업데이트합니다.")
    @PostMapping("")
    @Transactional
    public ResponseEntity<CustomFilter> saveCustomFilter(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @RequestBody SaveFilterRequest request
    ) {
        if (!StringUtils.hasText(remoteUser) || request.name() == null || request.name().isBlank() || request.filterData() == null) {
            return ResponseEntity.badRequest().build();
        }
        String operatorId = remoteUser.trim();
        String name = request.name().trim();

        Optional<CustomFilter> existing = customFilterRepository.findByOperatorIdAndName(operatorId, name);
        CustomFilter savedFilter;
        if (existing.isPresent()) {
            CustomFilter filter = existing.get();
            filter.updateFilterData(request.filterData());
            savedFilter = customFilterRepository.save(filter);
        } else {
            savedFilter = customFilterRepository.save(CustomFilter.create(operatorId, name, request.filterData()));
        }

        return ResponseEntity.ok(savedFilter);
    }

    @Operation(summary = "커스텀 필터 삭제", description = "저장된 커스텀 필터를 삭제합니다.")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteCustomFilter(
            @RequestHeader(value = "X-Remote-User", required = false) String remoteUser,
            @PathVariable("id") Long id
    ) {
        if (!StringUtils.hasText(remoteUser)) {
            return ResponseEntity.badRequest().build();
        }
        String operatorId = remoteUser.trim();
        Optional<CustomFilter> filterOpt = customFilterRepository.findByOperatorIdAndId(operatorId, id);
        if (filterOpt.isPresent()) {
            customFilterRepository.delete(filterOpt.get());
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
