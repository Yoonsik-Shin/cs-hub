package com.ttam.cs.infra.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;

/**
 * {@link RequireRoles} 어노테이션이 붙은 메소드의 접근 권한을 확인하는 Aspect 클래스입니다.
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class RoleAuthorizationAspect {

    @Before("@annotation(requireRoles)")
    public void authorize(RequireRoles requireRoles) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        boolean hasAccess = authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> {
                    String userAuthority = grantedAuthority.getAuthority(); // 예: "ROLE_ADMIN"
                    return Arrays.stream(requireRoles.value())
                            .anyMatch(role -> userAuthority.equals("ROLE_" + role.name()));
                });

        if (!hasAccess) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 기능에 접근할 권한이 없습니다.");
        }
    }
}
