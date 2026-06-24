-- naver_cafe_sessions 테이블에 갱신 토큰 및 만료 시간 컬럼 추가
ALTER TABLE naver_cafe_sessions
ADD COLUMN IF NOT EXISTS renewal_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS renewal_token_expires_at TIMESTAMPTZ;
