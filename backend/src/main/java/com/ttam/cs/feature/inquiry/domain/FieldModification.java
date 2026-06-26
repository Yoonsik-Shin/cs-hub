package com.ttam.cs.feature.inquiry.domain;

public record FieldModification(
    String field,
    String beforeValue,
    String afterValue,
    String reason
) {}
