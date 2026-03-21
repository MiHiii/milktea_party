-- 000001_init_schema.up.sql

-- Create a dedicated schema for the application
CREATE SCHEMA IF NOT EXISTS milktea;

-- Set search_path so functions and tables are created in the milktea schema
SET search_path TO milktea;

-- Helper function to generate UUID v7 (Now inside milktea schema)
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  timestamp    timestamptz;
  microseconds int8;
BEGIN
  timestamp    := clock_timestamp();
  microseconds := (CAST(extract(epoch FROM timestamp) * 1000000 AS int8) & 4294967295);

  RETURN decode(
    lpad(hex(CAST(extract(epoch FROM timestamp) * 1000 AS int8)), 12, '0') ||
    '7' ||
    lpad(hex(microseconds >> 12), 3, '0') ||
    hex(8 + (microseconds & 3)) ||
    lpad(hex(microseconds & 4095), 3, '0'),
    'hex'
  );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 1. Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    slug VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    host_device_id UUID NOT NULL,
    shop_link TEXT,
    host_default_bank_name TEXT,
    host_default_bank_account TEXT,
    host_default_qr_payload TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'locked', 'paid')),
    discount_type VARCHAR(10) DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percent')),
    discount_value BIGINT DEFAULT 0, -- VNĐ
    shipping_fee BIGINT DEFAULT 0,   -- VNĐ
    is_split_batch BOOLEAN DEFAULT FALSE,
    use_default_qr_for_all BOOLEAN DEFAULT TRUE,
    batch_configs JSONB DEFAULT '{}'::JSONB,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Participants Table
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_host BOOLEAN DEFAULT FALSE,
    is_paid BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (session_id, name)
);

-- 3. Order Batches Table
CREATE TABLE order_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank_name TEXT,
    bank_account TEXT,
    qr_payload TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'locked', 'paid')),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    order_batch_id UUID REFERENCES order_batches(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price >= 0), -- VNĐ
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    note TEXT,
    ice TEXT,
    sugar TEXT,
    pay_separate BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (Explicitly in milktea schema)
CREATE INDEX idx_sessions_slug ON sessions(slug);
CREATE INDEX idx_order_items_session_id ON order_items(session_id);
CREATE INDEX idx_order_items_participant_id ON order_items(participant_id);
CREATE INDEX idx_participants_session_id ON participants(session_id);
