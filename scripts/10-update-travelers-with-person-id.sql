-- Clear existing data and load the combined arrival and departure data
DELETE FROM travelers;

-- Add 'person_id' and 'notes' columns if they don't exist
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS person_id TEXT;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'departure';
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS checked_out BOOLEAN DEFAULT FALSE;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS overnight_hotel BOOLEAN DEFAULT FALSE;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Helper function to generate a consistent person_id from name
-- This is a simplified example; in a real DB, you'd manage person_ids more robustly
-- For demo purposes, we'll generate them directly in the inserts.

-- Insert Arrival Travelers (Alaska Airlines)
INSERT INTO travelers (person_id, name, flight_number, departure_time, checked_in, checked_out, photo_url, overnight_hotel, type, notes) VALUES
('person-herry-saputra', 'Herry Saputra', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-putu-sonny', 'Putu Sonny', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-hermie-tresvalles', 'Hermie Tresvalles', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-nino-dalawampu', 'Nino Dalawampu', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-roger-bermudeds', 'Roger Bermudeds', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-marlyd-fianan', 'Marlyd Fianan', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-terence-mirandilla', 'Terence Mirandilla', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-darwin-moliski', 'Darwin Moliski', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-randy-rabadon', 'Randy Rabadon', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-i-kadek-arnata', 'I Kadek Arnata', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-ray-john-lopera', 'Ray John Lopera', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-leo-reyes-jr', 'Leo Reyes Jr', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-wilmer-lucas', 'Wilmer Lucas', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-chrisopher-rosel', 'Chrisopher Rosel', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival', NULL),
('person-sachin-gigool', 'Sachin Gigool', 'Alaska Airlines 42', 'August 11, 5:23am', false, false, NULL, false, 'arrival', NULL),
('person-ramatoulie-badjie', 'Ramatoulie Badjie', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-sherl-furtado', 'Sherl Furtado', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-charlin-heritiana', 'Charlin Heritiana', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-jacqueline-mokoena', 'Jacqueline Mokoena', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-wellesly-coelho', 'Wellesly Coelho', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-dilu-roy', 'Dilu Roy', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-andrea-tapia-nolivos', 'Andrea Tapia Nolivos', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL),
('person-armando-viccina-salazar', 'Armando Viccina Salazar', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival', NULL);

-- Insert Departure Travelers (from new PDF, excluding unwanted cruise passengers)
INSERT INTO travelers (person_id, name, flight_number, departure_time, checked_in, checked_out, photo_url, type, notes) VALUES
('person-herry-saputra', 'Herry Saputra', 'China Airlines 21', 'August 11, 01:40', false, false, NULL, 'departure', NULL),
('person-putu-sonny', 'Putu Sonny', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-dilu-roy', 'Dilu Roy', 'QATAR 720', 'August 11, 4:30', false, false, NULL, 'departure', NULL),
('person-ramatoulie-badjie', 'Ramatoulie Badjie', 'Turkish 204', 'August 11, 7:10', false, false, NULL, 'departure', NULL),
('person-sachin-gigool', 'Sachin Gigool', 'Emirates 230', 'August 11, 5:15', false, false, NULL, 'departure', NULL),
('person-hermie-tresvalles', 'Hermie Tresvalles', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-i-kadek-arnata', 'I Kadek Arnata', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-ray-john-lopera', 'Ray John Lopera', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-leo-reyes-jr', 'Leo Reyes Jr', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-wilmer-lucas', 'Wilmer Lucas', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-nino-dalawampu', 'Nino Dalawampu', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure', NULL),
('person-sherl-furtado', 'Sherl Furtado', 'Lufthansa 491', 'August 11, 2:20', false, false, NULL, 'departure', NULL),
('person-charlin-heritiana', 'Charlin Heritiana', 'Emirates 230', 'August 11, 5:15', false, false, NULL, 'departure', NULL),
('person-jacqueline-mokoena', 'Jacqueline Mokoena', 'Emirates 230', 'August 11, 5:15', false, false, NULL, 'departure', NULL),
('person-wellesly-coelho', 'Wellesly Coelho', 'QATAR 720', 'August 11, 4:30', false, false, NULL, 'departure', NULL),
('person-roger-bermudeds', 'Roger Bermudeds', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure', NULL),
('person-marlyd-fianan', 'Marlyd Fianan', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure', NULL),
('person-terence-mirandilla', 'Terence Mirandilla', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure', NULL),
('person-darwin-moliski', 'Darwin Moliski', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure', NULL),
('person-randy-rabadon', 'Randy Rabadon', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure', NULL),
('person-chrisopher-rosel', 'Chrisopher Rosel', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure', NULL),
('person-andrea-tapia-nolivos', 'Andrea Tapia Nolivos', 'Alaska Airlines 363', 'August 11, 8:25', false, false, NULL, 'departure', NULL),
('person-armando-viccina-salazar', 'Armando Viccina Salazar', 'Alaska Airlines 363', 'August 11, 8:25', false, false, NULL, 'departure', NULL);
