package com.ttam.cs.infra.security;

/**
 * 관리자 및 운영자의 역할을 정의하는 Enum 클래스입니다.
 */
public enum AdminRole {
    ADMIN,      // 최고 관리자 (모든 권한)
    OPERATOR    // 일반 운영자 (이용 권한)
}
