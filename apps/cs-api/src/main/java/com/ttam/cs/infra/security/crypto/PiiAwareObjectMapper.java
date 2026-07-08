package com.ttam.cs.infra.security.crypto;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * DB 저장 전용 {@code ObjectMapper}를 감싸는 래퍼.
 *
 * <p>일부러 {@code ObjectMapper}를 직접 노출하지 않고 별도 타입으로 감싼다 — 앱 전역에 동일 타입의
 * {@code ObjectMapper} 빈이 두 개 존재하면, 이 빈과 무관한 곳(특히 Spring MVC의 HTTP 메시지 컨버터)까지
 * 어떤 빈을 골라야 할지 애매해져 실제로 HTTP 응답까지 암호화된 값이 나가는 문제가 재현됐다. 타입을
 * 분리하면 그런 모호함 자체가 원천적으로 발생하지 않는다.</p>
 */
public class PiiAwareObjectMapper {

    private final ObjectMapper delegate;

    public PiiAwareObjectMapper(ObjectMapper delegate) {
        this.delegate = delegate;
    }

    public ObjectMapper unwrap() {
        return delegate;
    }
}
