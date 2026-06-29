ALTER TABLE customer_inquiries ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT FALSE;

-- 기존 channel이 MANUAL이었던 건들은 수동 생성으로 간주하고, channel을 EMAIL로 보정
UPDATE customer_inquiries SET is_manual = TRUE WHERE channel = 'MANUAL';
UPDATE customer_inquiries SET channel = 'EMAIL' WHERE channel = 'MANUAL';
