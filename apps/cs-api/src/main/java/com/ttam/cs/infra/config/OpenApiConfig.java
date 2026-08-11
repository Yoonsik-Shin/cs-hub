package com.ttam.cs.infra.config;

import com.ttam.cs.infra.security.AdminRole;
import com.ttam.cs.infra.security.RequireInternalAuth;
import com.ttam.cs.infra.security.RequireRoles;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CS Hub API 명세서")
                        .version("1.0.0")
                        .description("""
                                고객 서비스 백엔드 API 명세서입니다. 문의 사항 관리, 웹훅 처리, 네이버 세션 관리 등의 기능을 제공합니다.

                                /api/** endpoint는 nginx Basic Auth 인증 후 전달되는 X-Remote-User 또는 내부 시스템용 X-Internal-Token 인증이 필요합니다.
                                @RequireRoles가 적용된 endpoint는 문서에 필요 역할과 x-required-roles 확장값으로 표시됩니다.
                                """))
                .components(new Components()
                        .addSecuritySchemes("InternalToken", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-Internal-Token")
                                .description("내부 시스템 간의 보안 통신을 위한 인증 토큰입니다."))
                        .addSecuritySchemes("NginxBasicAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("basic")
                                .description("nginx Basic Auth 인증입니다. 인증 성공 후 nginx가 X-Remote-User 헤더를 backend로 전달합니다.")));
    }

    @Bean
    public OperationCustomizer customizeSecurityMetadata() {
        return (operation, handlerMethod) -> {
            if (handlerMethod.hasMethodAnnotation(RequireInternalAuth.class) ||
                    handlerMethod.getBeanType().isAnnotationPresent(RequireInternalAuth.class)) {
                operation.addSecurityItem(new SecurityRequirement().addList("InternalToken"));
                appendDescription(operation,
                        "인증: X-Internal-Token이 필요합니다.");
            }

            RequireRoles requireRoles = findRequireRoles(handlerMethod);
            if (requireRoles != null) {
                List<String> roles = Arrays.stream(requireRoles.value())
                        .map(AdminRole::name)
                        .toList();
                operation.addSecurityItem(new SecurityRequirement().addList("NginxBasicAuth"));
                operation.addExtension("x-required-roles", roles);
                operation.addParametersItem(new io.swagger.v3.oas.models.parameters.Parameter()
                        .name("X-Remote-User")
                        .in("header")
                        .required(false)
                        .schema(new StringSchema())
                        .description("nginx Basic Auth 인증 성공 후 nginx가 backend로 전달하는 관리자 사용자명입니다. 클라이언트가 직접 설정하는 헤더가 아닙니다."));
                appendDescription(operation,
                        "필요 역할: " + String.join(", ", roles));
            }

            return operation;
        };
    }

    private RequireRoles findRequireRoles(org.springframework.web.method.HandlerMethod handlerMethod) {
        RequireRoles methodAnnotation = handlerMethod.getMethodAnnotation(RequireRoles.class);
        if (methodAnnotation != null) {
            return methodAnnotation;
        }
        return handlerMethod.getBeanType().getAnnotation(RequireRoles.class);
    }

    private void appendDescription(io.swagger.v3.oas.models.Operation operation, String line) {
        String description = operation.getDescription();
        if (description == null || description.isBlank()) {
            operation.setDescription(line);
            return;
        }
        operation.setDescription(description + "\n\n" + line);
    }
}
