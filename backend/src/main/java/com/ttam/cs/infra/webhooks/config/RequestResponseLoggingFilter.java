package com.ttam.cs.infra.webhooks.config;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * [Servlet Filter]
 * Logs HTTP request and response metadata (URI, Method, Status, Duration) for auditing and performance monitoring.
 */
@Component
@Slf4j
public class RequestResponseLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            logRequestAndResponse(request, response, duration);
        }
    }

    private void logRequestAndResponse(HttpServletRequest request, HttpServletResponse response, long duration) {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        String queryString = request.getQueryString();
        int status = response.getStatus();

        log.info("[HTTP] {} {}{} | Status: {} | Time: {}ms",
                method, uri, (queryString != null ? "?" + queryString : ""), status, duration);
    }
}
