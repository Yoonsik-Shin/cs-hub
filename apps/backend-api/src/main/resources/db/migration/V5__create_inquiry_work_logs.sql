CREATE TABLE IF NOT EXISTS inquiry_work_logs (
    id UUID PRIMARY KEY,
    inquiry_id UUID NOT NULL REFERENCES customer_inquiries(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    answer TEXT,
    memo TEXT,
    operator_info JSONB NOT NULL,
    previous_status VARCHAR(20),
    current_status VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiry_work_logs_inquiry_id ON inquiry_work_logs(inquiry_id);
