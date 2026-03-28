-- 000008_add_admin_secret.up.sql
SET search_path TO milktea;

ALTER TABLE sessions 
ADD COLUMN admin_secret_hash VARCHAR(255) NOT NULL DEFAULT '';
