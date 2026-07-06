-- customer_inquiries 테이블에 공통 이미지 URL 목록 컬럼 추가
ALTER TABLE customer_inquiries ADD COLUMN image_urls JSONB;
