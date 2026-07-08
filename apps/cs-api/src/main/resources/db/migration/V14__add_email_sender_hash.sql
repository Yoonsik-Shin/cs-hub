ALTER TABLE customer_inquiries
    ADD COLUMN email_sender_hash VARCHAR(64);

CREATE INDEX idx_customer_inquiries_email_sender_hash
    ON customer_inquiries (email_sender_hash)
    WHERE email_sender_hash IS NOT NULL;
