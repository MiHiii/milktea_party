-- Add room_id to sessions table
ALTER TABLE milktea.sessions ADD COLUMN room_id VARCHAR(10) UNIQUE;

-- Create index for faster lookup
CREATE INDEX idx_sessions_room_id ON milktea.sessions(room_id);
