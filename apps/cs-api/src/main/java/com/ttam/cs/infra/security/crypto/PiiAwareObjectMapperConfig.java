package com.ttam.cs.infra.security.crypto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ttam.cs.feature.inquiry.domain.vo.EmailMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.GoogleSheetMetadata;
import com.ttam.cs.feature.inquiry.domain.vo.PhoneMetadata;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * DB 저장 전용 {@code ObjectMapper}. {@link PiiJacksonMixins}를 등록해 PII 필드만 암호화/복호화한다.
 *
 * <p>기본 {@code ObjectMapper} 빈을 주입받아 {@code .copy()}하는 방식은 피한다 — 이 빈은
 * {@code HibernatePropertiesCustomizer}(entityManagerFactory 부트스트랩의 아주 이른 단계)에서 쓰이는데,
 * 거기서 공유 {@code ObjectMapper} 빈에 의존하면 빈 그래프 해석 중 순환 참조가 발생했다(실제로 재현됨).
 * 이 매퍼는 DB 왕복 저장에만 쓰이고 HTTP 응답 포맷과 동일할 필요가 없으므로, Spring Boot 기본값과
 * 동등한 설정으로 완전히 독립적으로 생성해 그 의존성을 끊는다.</p>
 *
 * <p>{@link PiiAwareObjectMapper}로 감싸 반환하는 이유: 앱 전역에 {@code ObjectMapper} 타입 빈이
 * 두 개가 되면 이 빈과 무관한 곳(Spring MVC의 HTTP 메시지 컨버터 등)까지 어떤 빈을 골라야 할지
 * 모호해져 HTTP 응답까지 암호화된 값이 나가는 문제가 실제로 재현됐다. 타입을 분리하면 그 모호함이
 * 원천적으로 발생하지 않는다.</p>
 */
@Configuration
public class PiiAwareObjectMapperConfig {

    @Bean
    public PiiAwareObjectMapper piiAwareObjectMapper() {
        ObjectMapper mapper = Jackson2ObjectMapperBuilder.json().build();
        mapper.addMixIn(PhoneMetadata.class, PiiJacksonMixins.PhoneMetadataMixin.class);
        mapper.addMixIn(GoogleSheetMetadata.class, PiiJacksonMixins.GoogleSheetMetadataMixin.class);
        mapper.addMixIn(EmailMetadata.class, PiiJacksonMixins.EmailMetadataMixin.class);
        return new PiiAwareObjectMapper(mapper);
    }
}
