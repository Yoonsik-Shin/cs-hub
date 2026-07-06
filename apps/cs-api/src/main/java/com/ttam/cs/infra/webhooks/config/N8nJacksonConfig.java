package com.ttam.cs.infra.webhooks.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.ttam.cs.infra.webhooks.handler.n8n.N8nWorkflowHandler;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class N8nJacksonConfig {

    private final ObjectMapper objectMapper;
    private final List<N8nWorkflowHandler<?>> handlers;

    @PostConstruct
    public void registerN8nSubtypes() {
        for (N8nWorkflowHandler<?> handler : handlers) {
            String name = handler.getWorkflowName();
            Class<?> type = handler.getPayloadType();
            objectMapper.registerSubtypes(new NamedType(type, name));
        }
    }
}
