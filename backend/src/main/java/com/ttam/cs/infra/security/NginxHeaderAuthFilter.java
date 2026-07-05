package com.ttam.cs.infra.security;

import com.ttam.cs.feature.auth.domain.entity.AdminMember;
import com.ttam.cs.feature.auth.repository.AdminMemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * NGINX가 Basic Auth 인증 성공 후 전달하는 'X-Remote-User' 헤더를 바탕으로
 * DB에서 계정 및 권한을 조회하고 스프링 시큐리티 컨텍스트에 인증 객체를 등록해 주는 필터입니다.
 */
@Component
@RequiredArgsConstructor
public class NginxHeaderAuthFilter extends OncePerRequestFilter {

    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";
    private final AdminMemberRepository adminMemberRepository;
    private final InternalAuthProperties internalAuthProperties;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (authenticateInternalTokenIfPresent(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String remoteUser = request.getHeader("X-Remote-User");
        boolean remoteUserRequired = requiresRemoteUser(request);

        if (remoteUser == null || remoteUser.isBlank()) {
            if (remoteUserRequired) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing authenticated user header");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        adminMemberRepository.findById(remoteUser.trim())
                .ifPresentOrElse(member -> authenticate(request, member), () -> {
                    if (remoteUserRequired) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    }
                });

        if (remoteUserRequired && response.getStatus() == HttpServletResponse.SC_UNAUTHORIZED) {
            response.getWriter().write("Unknown authenticated user");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean authenticateInternalTokenIfPresent(HttpServletRequest request) {
        String headerToken = request.getHeader(INTERNAL_TOKEN_HEADER);
        String configured = internalAuthProperties.getToken();
        if (!hasText(configured) || !hasText(headerToken) || !constantTimeEquals(configured, headerToken)) {
            return false;
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                "internal-system", null, List.of(new SimpleGrantedAuthority("ROLE_SYSTEM")));
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return true;
    }

    private void authenticate(HttpServletRequest request, AdminMember member) {
        // Spring Security가 이해하는 ROLE_ 접두사를 붙여 권한 설정
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole()));

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                member.getUsername(), null, authorities);

        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private boolean requiresRemoteUser(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            return false;
        }

        return !isN8nAuthCheck(request);
    }

    private boolean isN8nAuthCheck(HttpServletRequest request) {
        return "GET".equals(request.getMethod()) && "/api/v1/auth/n8n-check".equals(request.getRequestURI());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
