-- 이메일 회신(RE:) 매칭을 위한 parent_id 컬럼 추가
ALTER TABLE customer_inquiries
ADD COLUMN parent_id UUID NULL;

ALTER TABLE customer_inquiries
ADD CONSTRAINT fk_customer_inquiries_parent_id
FOREIGN KEY (parent_id) REFERENCES customer_inquiries(id)
ON DELETE SET NULL;

CREATE INDEX idx_customer_inquiries_parent_id ON customer_inquiries(parent_id);
