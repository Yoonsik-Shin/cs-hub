package com.ttam.cs.inquiry.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class CustomerInquiryIngestRequest {

    private UUID id;

    @NotBlank
    private String source;

    @NotBlank
    private String category;

    @NotBlank
    private String path;

    private String userCode;

    @NotNull
    private Map<String, Object> contactInfo;

    private String appVersion;

    private Map<String, Object> deviceInfo;

    @NotBlank
    private String contents;

    private String status;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;
}

