-- Remove room_id from sessions table
DROP INDEX IF EXISTS milktea.idx_sessions_room_id;
ALTER TABLE milktea.sessions DROP COLUMN IF EXISTS room_id;
