package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.feature.inquiry.service.CustomerInquiryService;
import lombok.RequiredArgsConstructor;
import com.ttam.cs.feature.inquiry.domain.CustomerInquiry;
import com.ttam.cs.common.dto.CursorPage;
import com.ttam.cs.feature.inquiry.api.http.dto.response.InquiryCountResponse;
import com.ttam.cs.feature.inquiry.api.http.dto.response.SearchCustomerInquiryResponse;
import com.ttam.cs.feature.inquiry.api.http.dto.response.InquiryWorkLogResponse;
import com.ttam.cs.feature.inquiry.api.http.dto.request.CreateInquiryRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryStatusRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryFieldsRequest;
import com.ttam.cs.feature.inquiry.api.http.dto.request.UpdateInquiryRequest;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
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

    @org.springframework.beans.factory.annotation.Value("${s3.external-url}")
    private String externalUrl;

    @org.springframework.beans.factory.annotation.Value("${s3.bucket}")
    private String bucketName;

    @Operation(summary = "고객 문의 내역 조건별 카운트 조회", description = "목록 데이터를 내려주지 않고 조건에 맞는 문의 수와 초과 여부만 조회합니다.")
    @GetMapping("/count")
    public ResponseEntity<InquiryCountResponse> count(
            @RequestParam(name = "channel", required = false) List<String> channels,
            @RequestParam(name = "userCode", required = false) String userCode,
            @RequestParam(name = "status", required = false) List<CustomerInquiry.Status> statuses,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam(name = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
            @RequestParam(name = "isManual", required = false) Boolean isManual,
            @RequestParam(name = "limit", defaultValue = "100") int limit) {
        int boundedLimit = Math.max(1, limit);
        long cappedCount = inquiryService.count(channels, userCode, statuses, keyword, start, end, isManual, boundedLimit + 1);
        boolean hasMore = cappedCount > boundedLimit;
        return ResponseEntity.ok(new InquiryCountResponse(Math.min(cappedCount, boundedLimit), hasMore));
    }

    @Operation(summary = "고객 문의 내역 검색 및 조회", description = "채널, 유저 코드, 상태, 검색 키워드, 시작/종료 시간 및 커서를 조합하여 고객 문의 내역 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<SearchCustomerInquiryResponse> search(
            @RequestParam(name = "channel", required = false) List<String> channels,
            @RequestParam(name = "userCode", required = false) String userCode,
            @RequestParam(name = "status", required = false) List<CustomerInquiry.Status> statuses,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam(name = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
            @RequestParam(name = "isManual", required = false) Boolean isManual,
            @RequestParam(name = "cursor", required = false) UUID cursor,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        CursorPage<CustomerInquiry> result = inquiryService.search(channels,
                userCode, statuses, keyword, start, end, isManual, cursor, size);

        String s3UrlPrefix = externalUrl.endsWith("/") ? 
                externalUrl + bucketName : 
                externalUrl + "/" + bucketName;

        return ResponseEntity.ok(SearchCustomerInquiryResponse.of(result, s3UrlPrefix));
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

    @Operation(summary = "고객 문의 정보 및 상태 수정", description = "고객 문의 리소스의 진행 상태 또는 세부 정보 필드들을 수정하고 이력을 남깁니다.")
    @PatchMapping("/{id}")
    public ResponseEntity<Void> updateInquiry(
            @PathVariable("id") UUID id,
            @RequestBody @Valid UpdateInquiryRequest request,
            HttpServletRequest servletRequest) {

        // 1. 상태 변경 건 처리
        if (request.status() != null) {
            UpdateInquiryStatusRequest statusRequest = new UpdateInquiryStatusRequest(
                    request.operatorInfo(),
                    request.status()
            );
            inquiryService.updateStatus(id, statusRequest);
        }

        // 2. 정보 필드 수정 건 처리
        if (request.channel() != null || 
            request.userCode() != null || 
            request.deviceInfo() != null || 
            request.content() != null ||
            request.imageUrls() != null) {
            
            UpdateInquiryFieldsRequest fieldsRequest = new UpdateInquiryFieldsRequest(
                    request.operatorInfo(),
                    request.channel(),
                    request.userCode(),
                    request.deviceInfo(),
                    request.content(),
                    request.imageUrls(),
                    request.reasons()
            );
            String ipAddress = getClientIp(servletRequest);
            inquiryService.updateInquiryFields(id, fieldsRequest, ipAddress);
        }

        return ResponseEntity.ok().build();
    }

    @Operation(summary = "문의 처리 작업 로그 전체 조회", description = "특정 문의 건에 기록된 모든 작업 처리 이력 목록을 조회합니다.")
    @GetMapping("/{id}/work-logs")
    public ResponseEntity<List<InquiryWorkLogResponse>> getWorkLogs(
            @PathVariable("id") UUID id) {
        List<InquiryWorkLogResponse> result = inquiryService.getWorkLogs(id);
        return ResponseEntity.ok(result);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
