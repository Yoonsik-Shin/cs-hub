CREATE TABLE IF NOT EXISTS customer_inquiries (
    id UUID PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    path VARCHAR(255) NOT NULL,
    user_code VARCHAR(255),
    contact_info JSONB NOT NULL,
    app_version VARCHAR(50),
    device_info JSONB,
    status VARCHAR(20) NOT NULL,
    contents TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

