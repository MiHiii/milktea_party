-- Re-implement uuid_generate_v7 correctly for PostgreSQL
-- This version ensures exactly 32 hex characters (128 bits)
CREATE OR REPLACE FUNCTION milktea.uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  v_time bigint;
  v_rand_a bigint;
  v_rand_b bigint;
  v_rand_c bigint;
BEGIN
  -- 1. Get current timestamp in milliseconds (48 bits)
  v_time := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  
  -- 2. Generate random bits for the rest (76 bits + 4 bit version + 2 bit variant)
  -- We use 3 random numbers to fill the remaining 80 bits
  v_rand_a := floor(random() * 4096)::bigint; -- 12 bits
  v_rand_b := floor(random() * 4294967296)::bigint; -- 32 bits
  v_rand_c := floor(random() * 4294967296)::bigint; -- 32 bits

  -- 3. Construct the 32-character hex string
  -- Format: [timestamp:12][version:1][rand_a:3][variant:1][rand_b+c:15]
  -- version = 7
  -- variant = 8 (binary 10xx)
  RETURN (
    lpad(to_hex(v_time), 12, '0') || 
    '7' || 
    lpad(to_hex(v_rand_a), 3, '0') || 
    to_hex(8 + (floor(random() * 4)::int)) || 
    lpad(to_hex(v_rand_b), 8, '0') || 
    lpad(to_hex(v_rand_c), 7, '0')
  )::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;
