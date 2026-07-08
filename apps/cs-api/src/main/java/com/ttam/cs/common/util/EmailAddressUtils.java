package com.ttam.cs.common.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 이메일 {@code From} 헤더처럼 표시 이름이 섞인 문자열에서 순수 이메일 주소를 뽑아내는 유틸.
 * 저장 시(해시 계산)와 조회 시(스레드 매칭) 동일한 정규화 로직을 써야 하므로 공용으로 둔다.
 */
public final class EmailAddressUtils {

    private static final Pattern ANGLE_BRACKET_EMAIL = Pattern.compile("<([^>]+)>");

    private EmailAddressUtils() {
    }

    /** {@code "홍길동 <user@example.com>"} 같은 문자열에서 {@code user@example.com}만 뽑아낸다. */
    public static String extractEmailAddress(String from) {
        if (from == null) {
            return null;
        }
        Matcher matcher = ANGLE_BRACKET_EMAIL.matcher(from);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return from.trim();
    }

    /** 해시 비교에 쓸 수 있도록 이메일 주소를 추출하고 대소문자를 정규화한다. */
    public static String normalizeForHash(String from) {
        String extracted = extractEmailAddress(from);
        if (extracted == null || extracted.isBlank()) {
            return null;
        }
        return extracted.toLowerCase();
    }
}
