package com.ttam.cs.feature.file.api.v1.controller;

import com.ttam.cs.feature.file.usecase.GeneratePresignedUploadUrlsUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "File Upload API", description = "파일 업로드 URL 발급 API")
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final GeneratePresignedUploadUrlsUseCase generatePresignedUploadUrlsUseCase;

    @Operation(summary = "일괄(Batch) Presigned 업로드 URL 발급", description = "여러 파일들에 대해 S3/MinIO에 직접 업로드할 수 있는 Presigned URL들과 최종 다운로드 URL 목록을 발급합니다.")
    @PostMapping("/presigned-urls")
    public ResponseEntity<PresignedUrlsResponseDto> getPresignedUploadUrls(
            @RequestBody @Valid GeneratePresignedUrlsRequestDto request) {
        List<PresignedUrlItemDto> urls = generatePresignedUploadUrlsUseCase.execute(
                request.getObjectNames(),
                request.getContentType()).stream()
                .map(item -> new PresignedUrlItemDto(item.objectName(), item.uploadUrl(), item.downloadUrl()))
                .toList();

        return ResponseEntity.ok(new PresignedUrlsResponseDto(urls));
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
