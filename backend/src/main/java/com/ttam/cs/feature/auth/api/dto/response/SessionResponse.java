package com.ttam.cs.feature.auth.api.dto.response;

import com.ttam.cs.feature.auth.domain.NaverCafeSession;

import java.time.OffsetDateTime;

public record SessionResponse(
        String id,
        String status,
        OffsetDateTime updatedAt
) {
    public static SessionResponse from(NaverCafeSession session) {
        return new SessionResponse(session.getId(), session.getStatus(), session.getUpdatedAt());
    }
}
