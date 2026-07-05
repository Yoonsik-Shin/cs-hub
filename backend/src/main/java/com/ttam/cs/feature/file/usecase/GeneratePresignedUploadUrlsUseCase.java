package com.ttam.cs.feature.file.usecase;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GeneratePresignedUploadUrlsUseCase {

    private final GeneratePresignedUploadUrlUseCase generatePresignedUploadUrlUseCase;

    public List<PresignedUrlItem> execute(List<String> objectNames, String contentType) {
        return objectNames.stream()
                .map(objectName -> {
                    GeneratePresignedUploadUrlUseCase.PresignedUrl presignedUrl =
                            generatePresignedUploadUrlUseCase.execute(objectName, contentType);
                    return new PresignedUrlItem(objectName, presignedUrl.uploadUrl(), presignedUrl.downloadUrl());
                })
                .toList();
    }

    public record PresignedUrlItem(String objectName, String uploadUrl, String downloadUrl) {
    }
}
