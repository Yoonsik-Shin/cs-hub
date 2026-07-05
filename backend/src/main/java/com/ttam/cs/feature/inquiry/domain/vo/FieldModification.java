package com.ttam.cs.feature.inquiry.domain.vo;

public record FieldModification(
    String field,
    String beforeValue,
    String afterValue,
    String reason
) {}
