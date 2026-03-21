-- Create a hex alias for bigint to fix compatibility
CREATE OR REPLACE FUNCTION milktea.hex(val bigint) 
RETURNS text AS $$
  SELECT to_hex(val);
$$ LANGUAGE sql IMMUTABLE;

-- Also update the main UUID v7 function just in case
CREATE OR REPLACE FUNCTION milktea.uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  timestamp    timestamptz;
  microseconds int8;
BEGIN
  timestamp    := clock_timestamp();
  microseconds := (CAST(extract(epoch FROM timestamp) * 1000000 AS int8) & 4294967295);

  RETURN decode(
    lpad(to_hex(CAST(extract(epoch FROM timestamp) * 1000 AS int8)), 12, '0') ||
    '7' ||
    lpad(to_hex(microseconds >> 12), 3, '0') ||
    to_hex(8 + (microseconds & 3)) ||
    lpad(to_hex(microseconds & 4095), 3, '0'),
    'hex'
  );
END;
$$ LANGUAGE plpgsql VOLATILE;
