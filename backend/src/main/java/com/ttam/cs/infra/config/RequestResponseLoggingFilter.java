package com.ttam.cs.infra.config;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.common.util.UuidUtils;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * [Servlet Filter]
 * Logs HTTP request and response metadata (URI, Method, Status, Duration) for
 * auditing and performance monitoring.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RequestResponseLoggingFilter extends OncePerRequestFilter {

    private static final Logger accessLogger = LoggerFactory.getLogger("com.ttam.cs.infra.logging.AccessLogger");
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    private final ObjectMapper objectMapper;

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
        String requestId = resolveRequestId(request);

        try {
            accessLogger.info("{}", objectMapper.writeValueAsString(accessLog(request, response, duration, requestId)));
        } catch (Exception e) {
            log.warn("[RequestResponseLoggingFilter] Failed to serialize access log", e);
        }

        String uri = request.getRequestURI();
        String method = request.getMethod();
        String queryString = request.getQueryString();
        int status = response.getStatus();

        log.info("[HTTP] {} {}{} | Status: {} | Time: {}ms",
                method, uri, (queryString != null ? "?" + queryString : ""), status, duration);
    }

    private Map<String, Object> accessLog(
            HttpServletRequest request,
            HttpServletResponse response,
            long duration,
            String requestId) {
        Map<String, Object> logFields = new LinkedHashMap<>();
        logFields.put("timestamp", OffsetDateTime.now().toString());
        logFields.put("eventName", "http.server.request");
        logFields.put("requestId", requestId);
        logFields.put("method", request.getMethod());
        logFields.put("path", request.getRequestURI());
        logFields.put("query", request.getQueryString());
        logFields.put("status", response.getStatus());
        logFields.put("durationMs", duration);
        logFields.put("clientAddress", clientAddress(request));
        logFields.put("userAgent", request.getHeader("User-Agent"));
        logFields.put("adminUser", request.getHeader("X-Remote-User"));
        return logFields;
    }

    private String resolveRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            return UuidUtils.generateUuidV7().toString();
        }
        return requestId.trim();
    }

    private String clientAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
