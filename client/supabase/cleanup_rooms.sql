-- SQL Script to clean up obsolete room feature
-- Run this in the Supabase SQL Editor

-- 1. Remove the room_id foreign key and column from the sessions table
alter table sessions drop column if exists room_id;

-- 2. Drop the rooms table
drop table if exists rooms;

-- 3. Remove room-related realtime settings if necessary
-- Note: Realtime tables are managed via the publication.
-- If you added it explicitly:
-- alter publication supabase_realtime remove table rooms;
