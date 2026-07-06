-- 1. 즐겨찾기 테이블 생성
CREATE TABLE inquiry_bookmark (
    id BIGSERIAL PRIMARY KEY,
    operator_id VARCHAR(50) NOT NULL,
    inquiry_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_operator_inquiry UNIQUE (operator_id, inquiry_id)
);

CREATE INDEX idx_bookmark_operator ON inquiry_bookmark(operator_id);

-- 2. 커스텀 필터 테이블 생성 (필터 데이터는 JSONB 컬럼에 저장)
CREATE TABLE custom_filter (
    id BIGSERIAL PRIMARY KEY,
    operator_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    filter_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_operator_filter_name UNIQUE (operator_id, name)
);

CREATE INDEX idx_custom_filter_operator ON custom_filter(operator_id);
