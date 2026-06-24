ALTER TABLE customer_inquiries ADD COLUMN unique_key UUID NOT NULL;
ALTER TABLE customer_inquiries ADD CONSTRAINT uq_customer_inquiries_unique_key UNIQUE (unique_key);
