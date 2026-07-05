package com.ttam.cs.infra.webhooks.dto.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record N8nWebhookRequest(
        @NotBlank(message = "워크플로우 이름은 필수입니다.")
        String workflowName,

        @Valid
        @JsonTypeInfo(use = JsonTypeInfo.Id.NAME,
                include = JsonTypeInfo.As.EXTERNAL_PROPERTY,
                property = "workflow_name", visible = true)
        N8nWorkflowPayload payload) {

    public interface N8nWorkflowPayload {
    }
}
