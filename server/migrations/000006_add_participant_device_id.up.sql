SET search_path TO milktea;

ALTER TABLE participants ADD COLUMN device_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX idx_participants_device_id ON participants(device_id);
