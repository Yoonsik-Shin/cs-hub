CREATE TABLE admin_member (
    username VARCHAR(50) PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_member (username, nickname, email, role)
VALUES ('runday-cs-admin', 'CS 관리자', 'cshub@ttam.ai', 'ADMIN')
ON CONFLICT (username) DO NOTHING;
