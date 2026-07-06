package com.ttam.cs.infra.webhooks.handler.n8n;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.ttam.cs.infra.webhooks.dto.request.N8nWebhookRequest.N8nWorkflowPayload;

@Component
public class N8nWorkflowRegistry {

    private final Map<String, N8nWorkflowHandler<?>> registry;

    public N8nWorkflowRegistry(List<N8nWorkflowHandler<?>> handlers) {
        this.registry = handlers.stream()
                .collect(Collectors.toUnmodifiableMap(
                        handler -> handler.getWorkflowName().toLowerCase(),
                        Function.identity()));
    }

    @SuppressWarnings("unchecked")
    public <T extends N8nWorkflowPayload> N8nWorkflowHandler<T> get(String workflowName) {
        if (workflowName == null) {
            throw new IllegalArgumentException("Workflow name must not be null");
        }
        N8nWorkflowHandler<?> handler = registry.get(workflowName.toLowerCase());
        if (handler == null) {
            throw new IllegalArgumentException("No N8nWorkflowHandler registered for workflow name: " + workflowName);
        }
        return (N8nWorkflowHandler<T>) handler;
    }
}
