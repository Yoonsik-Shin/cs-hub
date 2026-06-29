package com.ttam.cs.feature.inquiry.api.http.controller;

import com.ttam.cs.infra.security.RequireInternalAuth;
import com.ttam.cs.infra.storage.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Attachment API", description = "첨부파일 업로드 및 관리를 위한 내부 API")
@RestController
@RequestMapping("/api/internal/v1/inquiries/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final StorageService storageService;

    @Operation(summary = "Presigned 업로드 URL 발급", description = "파일을 S3/MinIO에 직접 업로드할 수 있는 Presigned URL과 최종 다운로드 URL을 발급합니다.")
    @PostMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponseDto> getPresignedUploadUrl(
            @RequestBody @Valid GeneratePresignedUrlRequestDto request) {
        
        StorageService.PresignedUrlResponse response = storageService.generateUploadUrl(
                request.getObjectName(), 
                request.getContentType()
        );

        return ResponseEntity.ok(new PresignedUrlResponseDto(
                response.uploadUrl(), 
                response.downloadUrl()
        ));
    }

    @Operation(summary = "일괄(Batch) Presigned 업로드 URL 발급", description = "여러 파일들에 대해 S3/MinIO에 직접 업로드할 수 있는 Presigned URL들과 최종 다운로드 URL 목록을 발급합니다.")
    @PostMapping("/presigned-urls")
    public ResponseEntity<PresignedUrlsResponseDto> getPresignedUploadUrls(
            @RequestBody @Valid GeneratePresignedUrlsRequestDto request) {
        
        List<PresignedUrlItemDto> urls = request.getObjectNames().stream()
                .map(objectName -> {
                    StorageService.PresignedUrlResponse response = storageService.generateUploadUrl(
                            objectName, 
                            request.getContentType()
                    );
                    return new PresignedUrlItemDto(objectName, response.uploadUrl(), response.downloadUrl());
                })
                .toList();

        return ResponseEntity.ok(new PresignedUrlsResponseDto(urls));
    }

    @Data
    public static class GeneratePresignedUrlRequestDto {
        @NotBlank(message = "오브젝트 경로는 필수입니다.")
        private String objectName;
        
        private String contentType;
    }

    @Data
    @RequiredArgsConstructor
    public static class PresignedUrlResponseDto {
        private final String uploadUrl;
        private final String downloadUrl;
    }

    @Data
    public static class GeneratePresignedUrlsRequestDto {
        @NotEmpty(message = "오브젝트 경로 목록은 필수입니다.")
        private List<String> objectNames;
        
        private String contentType;
    }

    @Data
    @RequiredArgsConstructor
    public static class PresignedUrlsResponseDto {
        private final List<PresignedUrlItemDto> urls;
    }

    @Data
    @RequiredArgsConstructor
    public static class PresignedUrlItemDto {
        private final String objectName;
        private final String uploadUrl;
        private final String downloadUrl;
    }
}
