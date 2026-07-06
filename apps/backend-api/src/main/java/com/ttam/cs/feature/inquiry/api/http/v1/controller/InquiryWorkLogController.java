package com.ttam.cs.feature.inquiry.api.http.v1.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ttam.cs.feature.inquiry.api.http.v1.dto.request.RegisterWorkLogRequest;
import com.ttam.cs.feature.inquiry.api.http.v1.dto.response.InquiryWorkLogResponse;
import com.ttam.cs.feature.inquiry.usecase.GetInquiryWorkLogsUseCase;
import com.ttam.cs.feature.inquiry.usecase.RegisterInquiryWorkLogUseCase;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Inquiry Work Log API", description = "문의 처리 작업 로그 등록 및 조회 API")
@RestController
@RequestMapping("/api/v1/inquiries/{inquiryId}/work-logs")
@RequiredArgsConstructor
public class InquiryWorkLogController {

    private final RegisterInquiryWorkLogUseCase registerInquiryWorkLogUseCase;
    private final GetInquiryWorkLogsUseCase getInquiryWorkLogsUseCase;

    @Operation(summary = "문의 처리 작업 로그 추가", description = "특정 문의 건에 대해 작업자의 조치 및 처리 이력 로그를 등록합니다.")
    @PostMapping("")
    public ResponseEntity<Void> addWorkLog(
            @PathVariable("inquiryId") UUID inquiryId,
            @RequestBody @Valid RegisterWorkLogRequest request) {
        UUID logId = registerInquiryWorkLogUseCase.execute(inquiryId, request);
        return ResponseEntity.created(URI.create("/api/v1/inquiries/" + inquiryId + "/work-logs/" + logId)).build();
    }

    @Operation(summary = "문의 처리 작업 로그 전체 조회", description = "특정 문의 건에 기록된 모든 작업 처리 이력 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<List<InquiryWorkLogResponse>> getWorkLogs(
            @PathVariable("inquiryId") UUID inquiryId) {
        List<InquiryWorkLogResponse> result = getInquiryWorkLogsUseCase.execute(inquiryId);
        return ResponseEntity.ok(result);
    }
}
