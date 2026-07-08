package com.ttam.cs.infra.config;

import org.hibernate.cfg.AvailableSettings;
import org.hibernate.type.format.jackson.JacksonJsonFormatMapper;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.ttam.cs.infra.security.crypto.PiiAwareObjectMapper;

@Configuration
public class HibernateJsonConfig {

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(PiiAwareObjectMapper piiAwareObjectMapper) {
        return hibernateProperties -> {
            hibernateProperties.put(AvailableSettings.JSON_FORMAT_MAPPER, new JacksonJsonFormatMapper(piiAwareObjectMapper.unwrap()));
        };
    }
}
