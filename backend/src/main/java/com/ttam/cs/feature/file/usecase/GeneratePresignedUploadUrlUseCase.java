package com.ttam.cs.feature.file.usecase;

import com.ttam.cs.infra.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GeneratePresignedUploadUrlUseCase {

    private final StorageService storageService;

    public PresignedUrl execute(String objectName, String contentType) {
        StorageService.PresignedUrlResponse response = storageService.generateUploadUrl(objectName, contentType);
        return new PresignedUrl(response.uploadUrl(), response.downloadUrl());
    }

    public record PresignedUrl(String uploadUrl, String downloadUrl) {
    }
}
