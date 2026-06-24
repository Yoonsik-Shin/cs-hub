package com.ttam.cs.infra.config;

import com.ttam.cs.infra.security.RequireInternalAuth;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CS Test Bed API 명세서")
                        .version("1.0.0")
                        .description("고객 서비스 백엔드 API 명세서입니다. 문의 사항 관리, 웹훅 처리, 네이버 세션 관리 등의 기능을 제공합니다."))
                .components(new Components()
                        .addSecuritySchemes("InternalToken", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-Internal-Token")
                                .description("내부 시스템 간의 보안 통신을 위한 인증 토큰입니다.")));
    }

    @Bean
    public OperationCustomizer customizeInternalAuth() {
        return (operation, handlerMethod) -> {
            if (handlerMethod.hasMethodAnnotation(RequireInternalAuth.class) ||
                    handlerMethod.getBeanType().isAnnotationPresent(RequireInternalAuth.class)) {
                operation.addSecurityItem(new SecurityRequirement().addList("InternalToken"));
            }
            return operation;
        };
    }
}
