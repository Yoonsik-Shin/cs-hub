package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.feature.inquiry.service.CustomerInquiryService;
import lombok.RequiredArgsConstructor;
import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.feature.inquiry.api.http.dto.response.SearchCustomerInquiryResponse;
import com.ttam.cs.feature.inquiry.api.http.dto.response.InquiryWorkLogResponse;
import com.ttam.cs.feature.inquiry.api.http.dto.request.CreateInquiryRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryStatusRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.net.URI;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Customer Inquiry API", description = "고객 문의 사항 목록 조회, 신규 등록, 상태 관리 및 처리 이력(작업 로그) 조회를 제공하는 API")
@RestController
@RequestMapping("/api/internal/v1/inquiries")
@RequiredArgsConstructor
public class CustomerInquiryController {

    private final CustomerInquiryService inquiryService;

    @Operation(summary = "고객 문의 내역 검색 및 조회", description = "채널, 유저 코드, 상태, 검색 키워드, 시작/종료 시간 및 커서를 조합하여 고객 문의 내역 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<SearchCustomerInquiryResponse> search(
            @RequestParam(name = "channel", required = false) String channel,
            @RequestParam(name = "userCode", required = false) String userCode,
            @RequestParam(name = "status", required = false) CustomerInquiry.Status status,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam(name = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
            @RequestParam(name = "cursor", required = false) UUID cursor,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        CursorPage<CustomerInquiry> result = inquiryService.search(channel,
                userCode, status, keyword, start, end, cursor, size);

        return ResponseEntity.ok(SearchCustomerInquiryResponse.of(result));
    }

    @Operation(summary = "고객 문의 생성", description = "신규 고객 문의 건을 접수 및 생성합니다.")
    @PostMapping("")
    public ResponseEntity<Void> create(
            @RequestBody @Valid CreateInquiryRequest request) {

        UUID id = inquiryService.create(request);

        return ResponseEntity.created(URI.create("/api/internal/v1/inquiries/" + id)).build();
    }

    @Operation(summary = "문의 처리 작업 로그 추가", description = "특정 문의 건에 대해 작업자의 조치 및 처리 이력 로그를 등록합니다.")
    @PostMapping("/{id}/work-logs")
    public ResponseEntity<Void> addWorkLog(
            @PathVariable("id") UUID id,
            @RequestBody @Valid RegisterWorkLogRequest request) {
        UUID logId = inquiryService.addWorkLog(id, request);
        return ResponseEntity.created(URI.create("/api/internal/v1/inquiries/" + id + "/work-logs/" + logId)).build();
    }

    @Operation(summary = "문의 상태 업데이트", description = "문의 건의 진행 상태(RECEIVED, IN_PROGRESS, RESOLVED 등)를 업데이트합니다.")
    @PatchMapping("/{id}")
    public ResponseEntity<Void> updateStatus(
            @PathVariable("id") UUID id,
            @RequestBody @Valid UpdateInquiryStatusRequest request) {
        inquiryService.updateStatus(id, request);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "문의 처리 작업 로그 전체 조회", description = "특정 문의 건에 기록된 모든 작업 처리 이력 목록을 조회합니다.")
    @GetMapping("/{id}/work-logs")
    public ResponseEntity<List<InquiryWorkLogResponse>> getWorkLogs(
            @PathVariable("id") UUID id) {
        List<InquiryWorkLogResponse> result = inquiryService.getWorkLogs(id);
        return ResponseEntity.ok(result);
    }
}