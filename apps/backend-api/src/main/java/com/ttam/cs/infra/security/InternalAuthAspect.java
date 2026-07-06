package com.ttam.cs.infra.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class InternalAuthAspect {

    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";
    private final InternalAuthProperties internalAuthProperties;

    @Before("@annotation(com.ttam.cs.infra.security.RequireInternalAuth)")
    public void authenticate() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return;
        }

        HttpServletRequest request = attributes.getRequest();
        String headerToken = request.getHeader(INTERNAL_TOKEN_HEADER);
        String configured = internalAuthProperties.getToken();

        if (StringUtils.hasText(configured)) {
            if (!StringUtils.hasText(headerToken) || !constantTimeEquals(configured, headerToken)) {
                log.warn("🚨 Unauthorized internal API access attempt. Target URI: {}", request.getRequestURI());
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized internal access");
            }
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
