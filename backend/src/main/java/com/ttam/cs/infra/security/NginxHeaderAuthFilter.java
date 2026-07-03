package com.ttam.cs.infra.security;

import com.ttam.cs.feature.auth.domain.AdminMember;
import com.ttam.cs.feature.auth.repo.AdminMemberRepository;
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

    private final AdminMemberRepository adminMemberRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String remoteUser = request.getHeader("X-Remote-User");

        if (remoteUser != null && !remoteUser.isBlank()) {
            adminMemberRepository.findById(remoteUser.trim()).ifPresent(member -> {
                // Spring Security가 이해하는 ROLE_ 접두사를 붙여 권한 설정
                List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole()));

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        member.getUsername(), null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }

        filterChain.doFilter(request, response);
    }
}
