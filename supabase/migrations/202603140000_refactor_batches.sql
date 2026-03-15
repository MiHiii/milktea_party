-- 1. Create order_batches table
create table if not exists order_batches (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid references sessions(id) on delete cascade,
    name text not null,
    bank_name text,
    bank_account text,
    qr_payload text,
    status text default 'open',
    created_at timestamp with time zone default now()
);

-- Add index for performance
create index if not exists idx_batch_session on order_batches(session_id);

-- Enable RLS
alter table order_batches enable row level security;
create policy "Allow all on order_batches" on order_batches for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table order_batches;

-- 2. Add order_batch_id to order_items
alter table order_items add column if not exists order_batch_id uuid references order_batches(id) on delete set null;

-- 3. Data Migration Logic
do $$
declare
    s_rec record;
    b_rec record;
    new_batch_id uuid;
begin
    for s_rec in select id, bank_name, bank_account, qr_payload from sessions loop
        
        -- Get unique batch names used in this session
        for b_rec in select distinct batch_group from order_items where session_id = s_rec.id loop
            insert into order_batches (session_id, name, bank_name, bank_account, qr_payload)
            values (s_rec.id, b_rec.batch_group, s_rec.bank_name, s_rec.bank_account, s_rec.qr_payload)
            returning id into new_batch_id;
            
            update order_items 
            set order_batch_id = new_batch_id 
            where session_id = s_rec.id and batch_group = b_rec.batch_group;
        end loop;

        -- Create one default batch if none exists
        if not exists (select 1 from order_batches where session_id = s_rec.id) then
            insert into order_batches (session_id, name, bank_name, bank_account, qr_payload)
            values (s_rec.id, 'Đơn 1', s_rec.bank_name, s_rec.bank_account, s_rec.qr_payload);
        end if;
    end loop;
end $$;

-- 4. Update order_items: remove batch_group
alter table order_items drop column if exists batch_group;

-- 5. Update sessions: rename fields to mark as defaults
alter table sessions rename column bank_name to host_default_bank_name;
alter table sessions rename column bank_account to host_default_bank_account;
alter table sessions rename column qr_payload to host_default_qr_payload;
