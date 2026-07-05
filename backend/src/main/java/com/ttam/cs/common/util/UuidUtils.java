package com.ttam.cs.common.util;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * UUID 관련 유틸리티입니다.
 *
 * <p>현재 프로젝트에서는 고객 문의와 작업 로그의 식별자를 UUID v7 형태로 생성합니다.
 * UUID v7은 앞쪽 비트에 현재 Unix epoch millisecond 값을 포함하므로, 랜덤 UUID(v4)보다
 * 생성 시간 순서대로 정렬되기 쉽고 DB 인덱스 locality 측면에서도 유리합니다.</p>
 *
 * <p>Java 표준 라이브러리는 아직 UUID v7 생성 API를 제공하지 않기 때문에, RFC 9562의
 * UUID v7 레이아웃에 맞춰 직접 비트를 조립합니다.</p>
 */
public final class UuidUtils {
    private static final SecureRandom random = new SecureRandom();

    private UuidUtils() {
    }

    /**
     * 현재 시각을 기준으로 UUID v7 값을 생성합니다.
     *
     * <p>UUID는 총 128비트이며 Java의 {@link UUID}는 이를 상위 64비트와 하위 64비트로 나눠 받습니다.
     * 이 메서드는 상위 64비트에 timestamp, version, 일부 랜덤 값을 넣고,
     * 하위 64비트에는 variant와 나머지 랜덤 값을 넣습니다.</p>
     *
     * @return 시간순 정렬 특성을 갖는 UUID v7
     */
    public static UUID generateUuidV7() {
        // UUID v7의 앞 48비트는 Unix epoch millisecond timestamp입니다.
        // millisecond 값을 상위 64비트의 앞쪽에 배치하기 위해 16비트 왼쪽으로 민다.
        long valueMs = Instant.now().toEpochMilli();
        long high = valueMs << 16;

        // 상위 64비트의 남은 16비트 중 하위 12비트는 랜덤 값으로 채운다.
        // 이후 version 영역 4비트를 비워두고 UUID v7을 뜻하는 0b0111(0x7)을 설정한다.
        high |= (random.nextLong() & 0xFFFL);
        high &= ~0xF000L;
        high |= 0x7000L;

        // 하위 64비트는 대부분 랜덤 값으로 채운다.
        // 단, UUID variant 규격상 최상위 2비트는 RFC 4122/9562 variant인 0b10이어야 한다.
        long low = random.nextLong();
        low &= ~0xC000000000000000L;
        low |= 0x8000000000000000L;

        return new UUID(high, low);
    }
}
