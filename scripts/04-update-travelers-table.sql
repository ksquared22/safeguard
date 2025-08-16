-- Update the travelers table to match the simplified structure
ALTER TABLE travelers DROP COLUMN IF EXISTS departure_time;
ALTER TABLE travelers DROP COLUMN IF EXISTS destination;

-- Update existing data to use the new flight format
UPDATE travelers SET flight_number = 'Sample Flight' WHERE flight_number IS NULL;
