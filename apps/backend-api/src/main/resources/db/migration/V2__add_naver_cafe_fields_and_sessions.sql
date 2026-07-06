-- 네이버 인증 세션 관리를 위한 테이블 생성
CREATE TABLE IF NOT EXISTS naver_cafe_sessions (
    id VARCHAR(50) PRIMARY KEY,
    encrypted_cookies TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
