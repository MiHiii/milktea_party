-- 1. Add missing columns to sessions
alter table sessions add column if not exists is_split_batch boolean default false;
alter table sessions add column if not exists batch_configs jsonb default '{}'::jsonb;
alter table sessions add column if not exists password text;
alter table sessions add column if not exists room_id varchar(30);

-- 2. Update host_device_id to text to support non-UUID IDs (for mobile/HTTP compatibility)
alter table sessions alter column host_device_id type text;
alter table participants alter column last_active type timestamp with time zone; -- just ensuring

-- 3. Add missing column to order_items
alter table order_items add column if not exists batch_group text default 'Đơn 1';

-- 4. Create rooms table if not exists (from previous migration)
create table if not exists rooms (
  id varchar(30) primary key,
  title text not null,
  host_device_id text not null, -- use text here too
  password text,
  created_at timestamp with time zone default now()
);

-- 5. Add FK constraint if not exists
do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_room_id_fkey') then
    alter table sessions add constraint sessions_room_id_fkey foreign key (room_id) references rooms(id) on delete cascade;
  end if;
end $$;
