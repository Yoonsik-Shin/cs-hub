package com.ttam.cs.infra.security;

import java.lang.annotation.*;

/**
 * 특정 API에 대해 허용할 관리자 역할 목록을 지정하는 어노테이션입니다.
 * 컨트롤러 메소드 또는 클래스 레벨에 적용할 수 있습니다.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface RequireRoles {
    AdminRole[] value();
}
