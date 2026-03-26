-- Update session status constraints to 6 states
ALTER TABLE milktea.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE milktea.sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('open', 'locked', 'ordered', 'settling', 'completed', 'cancelled'));

-- Also update order_batches status for consistency
ALTER TABLE milktea.order_batches DROP CONSTRAINT IF EXISTS order_batches_status_check;
ALTER TABLE milktea.order_batches ADD CONSTRAINT order_batches_status_check CHECK (status IN ('open', 'locked', 'ordered', 'settling', 'completed', 'cancelled', 'paid'));
