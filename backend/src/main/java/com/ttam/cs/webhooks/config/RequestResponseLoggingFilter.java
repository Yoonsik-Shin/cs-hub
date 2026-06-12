package com.ttam.cs.webhooks.config;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * [Servlet Filter]
 * Caches HTTP request and response bodies, logging details for auditing and debugging.
 */
@Component
@Slf4j
public class RequestResponseLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Body 캐싱을 위해 ContentCaching Wrapper로 감싸기
        ContentCachingRequestWrapper requestWrapper = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(requestWrapper, responseWrapper);
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            logRequest(requestWrapper);
            logResponse(responseWrapper, duration);

            // 중요: 응답 바디 캐시를 다시 실제 response 스트림으로 복사하여 클라이언트에 데이터가 전달되도록 함
            responseWrapper.copyBodyToResponse();
        }
    }

    private void logRequest(ContentCachingRequestWrapper request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        String queryString = request.getQueryString();
        String payload = new String(request.getContentAsByteArray());

        log.info("▶ [HTTP REQUEST] {} {}{} | Body: {}",
                method, uri, (queryString != null ? "?" + queryString : ""), payload);
    }

    private void logResponse(ContentCachingResponseWrapper response, long duration) {
        int status = response.getStatus();
        String payload = new String(response.getContentAsByteArray());

        log.info("◀ [HTTP RESPONSE] Status: {} | Time: {}ms | Body: {}", status, duration, payload);
    }
}
