package com.ttam.cs.feature.inquiry.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.infra.security.crypto.PiiAwareObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class IntegrationJacksonConfig {

    private final ObjectMapper objectMapper;
    private final PiiAwareObjectMapper piiAwareObjectMapper;

    @PostConstruct
    public void registerChannelMetadataSubtypes() {
        ChannelMetadataSubtypeRegistrar.registerAll(objectMapper, piiAwareObjectMapper.unwrap());
    }
}
