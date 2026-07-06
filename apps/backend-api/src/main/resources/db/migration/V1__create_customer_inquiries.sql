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
