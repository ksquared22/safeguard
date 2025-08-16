-- Clear existing data and load the combined arrival and departure data
DELETE FROM travelers;

-- Add 'type' and 'checked_out' columns if they don't exist
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'departure';
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS checked_out BOOLEAN DEFAULT FALSE;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS overnight_hotel BOOLEAN DEFAULT FALSE; -- Ensure this exists
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE;


-- Insert Arrival Travelers (Alaska Airlines)
INSERT INTO travelers (id, name, flight_number, departure_time, checked_in, checked_out, photo_url, overnight_hotel, type) VALUES
('arr-1', 'Herry Saputra', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-2', 'Putu Sonny', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-3', 'Hermie Tresvalles', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-4', 'Nino Dalawampu', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-5', 'Roger Bermudeds', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-6', 'Marlyd Fianan', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('('arr-7', 'Terence Mirandilla', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-8', 'Darwin Moliski', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-9', 'Randy Rabadon', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-10', 'I Kadek Arnata', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-11', 'Ray John Lopera', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-12', 'Leo Reyes Jr', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-13', 'Wilmer Lucas', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-14', 'Chrisopher Rosel', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, false, 'arrival'),
('arr-15', 'Sachin Gigool', 'Alaska Airlines 42', 'August 11, 5:23am', false, false, NULL, false, 'arrival'),
('arr-16', 'Ramatoulie Badjie', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-17', 'Sherl Furtado', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-18', 'Charlin Heritiana', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-19', 'Jacqueline Mokoena', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-20', 'Wellesly Coelho', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-21', 'Dilu Roy', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-22', 'Andrea Tapia Nolivos', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival'),
('arr-23', 'Armando Viccina Salazar', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false, NULL, true, 'arrival');

-- Insert Departure Travelers (from new PDF)
INSERT INTO travelers (id, name, flight_number, departure_time, checked_in, checked_out, photo_url, type) VALUES
('dep-1', 'Herry Saputra', 'China Airlines 21', 'August 11, 01:40', false, false, NULL, 'departure'),
('dep-2', 'Putu Sonny', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-3', 'Dilu Roy', 'QATAR 720', 'August 11, 4:30', false, false, NULL, 'departure'),
('dep-4', 'Ramatoulie Badjie', 'Turkish 204', 'August 11, 7:10', false, false, NULL, 'departure'),
('dep-5', 'Sachin Gigool', 'Emirates 230', 'August 11, 5:15', false, false, NULL, 'departure'),
('dep-6', 'Hermie Tresvalles', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-7', 'I Kadek Arnata', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-8', 'Ray John Lopera', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-9', 'Leo Reyes Jr', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-10', 'Wilmer Lucas', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-11', 'Nino Dalawampu', 'EVA 25', 'August 11, 2:10', false, false, NULL, 'departure'),
('dep-12', 'Sherl Furtado', 'Lufthansa 491', 'August 11, 2:20', false, false, NULL, 'departure'),
('dep-13', 'Charlin Heritiana', 'Emirates 230', 'August 11, 5:15', false, false, NULL, 'departure'),
('dep-14', 'Jacqueline Mokoena', 'Emirates 230', 'August 11, 5:15', false, false, NULL, 'departure'),
('dep-15', 'Wellesly Coelho', 'QATAR 720', 'August 11, 4:30', false, false, NULL, 'departure'),
('dep-16', 'Roger Bermudeds', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure'),
('dep-17', 'Marlyd Fianan', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure'),
('dep-18', 'Terence Mirandilla', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure'),
('dep-19', 'Darwin Moliski', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure'),
('dep-20', 'Randy Rabadon', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure'),
('dep-21', 'Chrisopher Rosel', 'China Airlines 21', 'August 11, 1:40', false, false, NULL, 'departure'),
('dep-22', 'Andrea Tapia Nolivos', 'Alaska Airlines 363', 'August 11, 8:25', false, false, NULL, 'departure'),
('dep-23', 'Armando Viccina Salazar', 'Alaska Airlines 363', 'August 11, 8:25', false, false, NULL, 'departure'),
('dep-24', 'Celebrity Summit Passenger', 'Celebrity Summit 1', 'TBD', false, false, NULL, 'cruise'),
('dep-25', 'Radiance Passenger 1', 'Radiance of the Sea 2', 'TBD', false, false, NULL, 'cruise'),
('dep-26', 'Radiance Passenger 2', 'Radiance of the Sea 2', 'TBD', false, false, NULL, 'cruise');
