-- Remove bank_account_name from sessions and order_batches
ALTER TABLE sessions DROP COLUMN IF EXISTS host_default_bank_account_name;
ALTER TABLE order_batches DROP COLUMN IF EXISTS bank_account_name;
