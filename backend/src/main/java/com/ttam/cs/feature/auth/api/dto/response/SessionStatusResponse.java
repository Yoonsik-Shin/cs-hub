package com.ttam.cs.feature.auth.api.dto.response;

import java.time.OffsetDateTime;

public record SessionStatusResponse(
        String id,
        String status,
        OffsetDateTime updatedAt,
        boolean valid,
        boolean shouldAlert,
        String renewalToken
) {
    public static SessionStatusResponse missing(String id) {
        return new SessionStatusResponse(id, "MISSING", null, false, false, null);
    }
}
