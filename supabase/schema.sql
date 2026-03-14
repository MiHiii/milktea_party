-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Sessions Table
create table sessions (
    id uuid primary key default uuid_generate_v4(),
    slug varchar(20) unique not null,
    title text not null,
    host_device_id uuid not null,
    shop_link text,
    bank_name text,
    bank_account text,
    qr_payload text,
    status varchar(20) default 'open' check (status in ('open', 'locked', 'paid')),
    discount_type varchar(10) default 'amount' check (discount_type in ('amount', 'percent')),
    discount_value numeric default 0,
    shipping_fee numeric default 0,
    created_at timestamp with time zone default now()
);

-- 2. Participants Table
create table participants (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid references sessions(id) on delete cascade,
    name varchar(50) not null,
    is_host boolean default false,
    is_paid boolean default false,
    last_active timestamp with time zone default now(),
    unique (session_id, name)
);

-- 3. Order Items Table
create table order_items (
    id uuid primary key default uuid_generate_v4(),
    participant_id uuid references participants(id) on delete cascade,
    session_id uuid references sessions(id) on delete cascade,
    item_name text not null,
    price numeric not null check (price >= 0),
    quantity int default 1 check (quantity > 0),
    note text,
    created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_session_slug on sessions(slug);
create index idx_order_session on order_items(session_id);
create index idx_order_participant on order_items(participant_id);
create index idx_participant_session on participants(session_id);

-- Enable Row Level Security (open access via anon key - suitable for no-login app)
alter table sessions enable row level security;
alter table participants enable row level security;
alter table order_items enable row level security;

-- RLS Policies: allow all operations for anonymous users (app controls auth via host_device_id in client)
create policy "Allow all on sessions" on sessions for all using (true) with check (true);
create policy "Allow all on participants" on participants for all using (true) with check (true);
create policy "Allow all on order_items" on order_items for all using (true) with check (true);

-- Enable Realtime on relevant tables
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table sessions;
