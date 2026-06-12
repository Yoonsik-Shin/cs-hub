SELECT 'CREATE DATABASE wikijs' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wikijs')\gexec
