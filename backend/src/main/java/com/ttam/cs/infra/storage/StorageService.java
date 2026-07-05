package com.ttam.cs.infra.storage;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.ttam.cs.common.exception.BusinessException;
import com.ttam.cs.common.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;

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

            String downloadUrl = externalUrl.endsWith("/") ? externalUrl + bucketName + "/" + objectName
                    : externalUrl + "/" + bucketName + "/" + objectName;

            return new PresignedUrlResponse(uploadUrl, downloadUrl);
        } catch (Exception e) {
            log.error("Failed to generate presigned upload URL for object: {}", objectName, e);
            throw new BusinessException(ErrorCode.STORAGE_ERROR, e);
        }
    }

    /**
     * MinIO에서 오브젝트를 실제 삭제합니다.
     * downloadUrl 전체 또는 objectKey(버킷 이하의 경로) 중 하나를 받아 처리합니다.
     *
     * @param objectKeyOrUrl 오브젝트 경로 또는 다운로드 URL 전체
     */
    public void deleteObject(String objectKeyOrUrl) {
        try {
            String objectKey = extractObjectKey(objectKeyOrUrl);
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.info("Deleted object from storage: {}", objectKey);
        } catch (Exception e) {
            log.error("Failed to delete object from storage: {}", objectKeyOrUrl, e);
            throw new BusinessException(ErrorCode.STORAGE_ERROR, e);
        }
    }

    /**
     * 다운로드 URL에서 오브젝트 키(버킷명 이후의 경로)를 추출합니다.
     */
    public String extractObjectKey(String objectKeyOrUrl) {
        if (objectKeyOrUrl == null) {
            return null;
        }

        // 1. /attachments/{bucket}/ 형태가 포함되어 있으면 그 뒤의 경로 추출
        String proxyMarker = "/attachments/" + bucketName + "/";
        int proxyIndex = objectKeyOrUrl.indexOf(proxyMarker);
        if (proxyIndex != -1) {
            return objectKeyOrUrl.substring(proxyIndex + proxyMarker.length());
        }

        // 2. /{bucket}/ 형태가 포함되어 있으면 그 뒤의 경로 추출
        String directMarker = "/" + bucketName + "/";
        int directIndex = objectKeyOrUrl.indexOf(directMarker);
        if (directIndex != -1 && (objectKeyOrUrl.startsWith("http://") || objectKeyOrUrl.startsWith("https://"))) {
            return objectKeyOrUrl.substring(directIndex + directMarker.length());
        }

        // 3. prefix와 비교하는 fallback 로직
        String prefix = externalUrl.endsWith("/") ? externalUrl + bucketName + "/"
                : externalUrl + "/" + bucketName + "/";

        if (objectKeyOrUrl.startsWith(prefix)) {
            return objectKeyOrUrl.substring(prefix.length());
        }

        // 이미 objectKey 형태인 경우 그대로 반환
        return objectKeyOrUrl;
    }

    public record PresignedUrlResponse(String uploadUrl, String downloadUrl) {
    }
}
