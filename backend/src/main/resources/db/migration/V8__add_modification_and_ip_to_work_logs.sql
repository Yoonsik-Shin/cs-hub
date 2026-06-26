ALTER TABLE inquiry_work_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE inquiry_work_logs ADD COLUMN IF NOT EXISTS modification_details JSONB;
