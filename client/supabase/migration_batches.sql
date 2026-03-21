alter table order_items add column if not exists batch_group text default 'Đơn 1';
alter table sessions add column if not exists batch_configs jsonb default '{}'::jsonb;
alter table sessions add column if not exists is_split_batch boolean default false;
