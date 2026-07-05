package com.ttam.cs.infra.webhooks.handler.n8n.workflow;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.ttam.cs.infra.webhooks.handler.n8n.workflow.dto.DataIntegrationPayload;
import com.ttam.cs.feature.inquiry.usecase.event.DataIntegrationRequestedEvent;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowHandler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class DataIntegrationWorkflowHandler implements N8nWorkflowHandler<DataIntegrationPayload> {

    private final ApplicationEventPublisher eventPublisher;

    @Override
    public String getWorkflowName() {
        return "csDataIntegration";
    }

    @Override
    public Class<DataIntegrationPayload> getPayloadType() {
        return DataIntegrationPayload.class;
    }

    @Override
    public void execute(DataIntegrationPayload payload) {
        eventPublisher.publishEvent(new DataIntegrationRequestedEvent(payload));
    }
}
