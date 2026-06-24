package com.ttam.cs.infra.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "security.internal")
public class InternalAuthProperties {

    /**
     * n8n에서 호출할 때 사용하는 공유 비밀 토큰 값.
     */
    private String token;
}
