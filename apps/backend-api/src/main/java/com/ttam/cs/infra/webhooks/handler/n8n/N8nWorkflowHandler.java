package com.ttam.cs.infra.webhooks.handler.n8n;

import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest.N8nWorkflowPayload;

public interface N8nWorkflowHandler<T extends N8nWorkflowPayload> {
    String getWorkflowName();
    Class<T> getPayloadType();
    void execute(T payload);
}
