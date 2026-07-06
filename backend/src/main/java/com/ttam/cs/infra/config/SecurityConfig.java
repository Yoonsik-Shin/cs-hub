package com.ttam.cs.infra.config;

import com.ttam.cs.infra.security.InternalAuthProperties;
import com.ttam.cs.infra.security.NginxHeaderAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@EnableConfigurationProperties({ InternalAuthProperties.class })
@RequiredArgsConstructor
public class SecurityConfig {

    private final NginxHeaderAuthFilter nginxHeaderAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable());

        // Nginx 헤더 파싱 필터를 UsernamePasswordAuthenticationFilter 전에 추가
        http.addFilterBefore(nginxHeaderAuthFilter, UsernamePasswordAuthenticationFilter.class);

        http.authorizeHttpRequests(registry -> registry
                .requestMatchers("/internal/actuator/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/admin-tool-check").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll());
        return http.build();
    }
}
