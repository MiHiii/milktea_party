-- Rooms table (top-level container for multiple sub-orders)
create table if not exists rooms (

  id varchar(30) primary key,
  title text not null,
  host_device_id uuid not null,
  password text,                    -- plain text (no-login app), null = no password
  created_at timestamp with time zone default now()
);

-- Ensure password column exists if table was created previously with 'password_hash'
alter table rooms add column if not exists password text;

-- Add room_id FK and password to sessions
alter table sessions add column if not exists room_id varchar(30) references rooms(id) on delete cascade;
alter table sessions add column if not exists password text;

-- RLS
alter table rooms enable row level security;
create policy "Allow all on rooms" on rooms for all using (true) with check (true);

-- Index
create index if not exists idx_session_room on sessions(room_id);

-- Enable realtime on rooms (optional, good for live updates)
alter publication supabase_realtime add table rooms;
