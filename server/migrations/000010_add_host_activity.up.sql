-- 000010_add_host_activity.up.sql
SET search_path TO milktea;

ALTER TABLE sessions 
ADD COLUMN host_last_active TIMESTAMPTZ NOT NULL DEFAULT NOW();
