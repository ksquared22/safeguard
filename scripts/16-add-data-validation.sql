-- Additional data validation and cleanup script

-- Add function to validate and normalize person_id
CREATE OR REPLACE FUNCTION normalize_person_id(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalize person_id format
  RETURN 'person-' || lower(trim(regexp_replace(
    regexp_replace(input_text, '^person-', '', 'i'),
    '[^a-z0-9\s-]', '', 'g'
  )));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add function to validate flight number format
CREATE OR REPLACE FUNCTION is_valid_flight_number(flight_num TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow flexible flight number formats but ensure basic structure
  RETURN flight_num ~ '^[A-Za-z][A-Za-z0-9\s]+[0-9]+$' AND length(trim(flight_num)) BETWEEN 3 AND 50;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing data to ensure consistency
UPDATE travelers 
SET person_id = normalize_person_id(COALESCE(person_id, name))
WHERE person_id IS NULL OR person_id = '';

-- Add check constraint using the validation function
ALTER TABLE travelers 
ADD CONSTRAINT chk_valid_flight_number 
CHECK (is_valid_flight_number(flight_number));

-- Create view for reporting with computed fields
CREATE OR REPLACE VIEW traveler_summary AS
SELECT 
  t.*,
  CASE 
    WHEN t.type = 'departure' AND t.checked_out THEN 'Departed'
    WHEN t.checked_in THEN 'Checked In'
    ELSE 'Pending'
  END as status,
  CASE 
    WHEN t.check_in_time IS NOT NULL AND t.check_out_time IS NOT NULL 
    THEN t.check_out_time - t.check_in_time
    ELSE NULL
  END as duration_on_site
FROM travelers t;

-- Grant appropriate permissions
GRANT SELECT ON traveler_summary TO authenticated;
