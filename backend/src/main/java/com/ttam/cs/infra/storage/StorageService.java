package com.ttam.cs.infra.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final S3Presigner s3Presigner;

    @Value("${s3.bucket}")
    private String bucketName;

    @Value("${s3.external-url}")
    private String externalUrl;

    public PresignedUrlResponse generateUploadUrl(String objectName, String contentType) {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectName)
                    .contentType(contentType)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(30))
                    .putObjectRequest(putObjectRequest)
                    .build();

            var presignedRequest = s3Presigner.presignPutObject(presignRequest);
            String uploadUrl = presignedRequest.url().toString();

            String downloadUrl = externalUrl.endsWith("/") ? 
                    externalUrl + bucketName + "/" + objectName : 
                    externalUrl + "/" + bucketName + "/" + objectName;

            return new PresignedUrlResponse(uploadUrl, downloadUrl);
        } catch (Exception e) {
            log.error("Failed to generate presigned upload URL for object: {}", objectName, e);
            throw new RuntimeException("파일 업로드 URL 생성에 실패했습니다.", e);
        }
    }

    public record PresignedUrlResponse(String uploadUrl, String downloadUrl) {}
}
