-- customer_inquiries 테이블이 누락된 경우를 대비한 복구 마이그레이션
-- V1에서 생성되었어야 하지만, DB 볼륨 재생성 등으로 인해 테이블이 사라진 경우 대응
CREATE TABLE IF NOT EXISTS customer_inquiries (
    id UUID PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    user_code VARCHAR(255),
    channel_metadata JSONB,
    device_info JSONB,
    status VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
