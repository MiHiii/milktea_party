-- Add bank_account_name to sessions and order_batches
ALTER TABLE sessions ADD COLUMN host_default_bank_account_name text;
ALTER TABLE order_batches ADD COLUMN bank_account_name text;
