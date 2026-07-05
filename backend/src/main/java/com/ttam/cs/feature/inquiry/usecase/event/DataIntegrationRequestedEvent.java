package com.ttam.cs.feature.inquiry.usecase.event;

import com.ttam.cs.infra.webhooks.handler.n8n.workflow.dto.DataIntegrationPayload;

public record DataIntegrationRequestedEvent(DataIntegrationPayload payload) {
}
