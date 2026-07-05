package com.ttam.cs.infra.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RequiredPropertiesValidator {
    private static final List<String> REQUIRED_PROPERTIES = List.of(
            "DB_USERNAME",
            "DB_PASSWORD",
            "INTERNAL_API_TOKEN",
            "S3_ACCESS_KEY",
            "S3_SECRET_KEY",
            "NAVER_SESSION_SECRET"
    );

    private final Environment environment;

    @PostConstruct
    void validate() {
        if (Arrays.asList(environment.getActiveProfiles()).contains("local")) {
            return;
        }

        List<String> missing = REQUIRED_PROPERTIES.stream()
                .filter(name -> !StringUtils.hasText(environment.getProperty(name)))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Required environment variables are missing: " + String.join(", ", missing));
        }
    }
}
