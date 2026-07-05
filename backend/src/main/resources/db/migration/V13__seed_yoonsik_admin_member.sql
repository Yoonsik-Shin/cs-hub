INSERT INTO admin_member (username, nickname, email, role)
VALUES ('yoonsik', 'CS 관리자', 'cshub@ttam.ai', 'ADMIN')
ON CONFLICT (username) DO UPDATE
SET nickname = EXCLUDED.nickname,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
