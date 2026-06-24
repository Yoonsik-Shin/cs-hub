package com.ttam.cs.common.util;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

public final class UuidUtils {
    private static final SecureRandom random = new SecureRandom();

    private UuidUtils() {}

    public static UUID generateUuidV7() {
        long valueMs = Instant.now().toEpochMilli();
        long high = valueMs << 16;

        high |= (random.nextLong() & 0xFFFL);
        high &= ~0xF000L;
        high |= 0x7000L;

        long low = random.nextLong();
        low &= ~0xC000000000000000L;
        low |= 0x8000000000000000L;

        return new UUID(high, low);
    }
}
