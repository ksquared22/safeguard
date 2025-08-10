-- Clear existing data and load the exact PDF data with overnight hotel information
DELETE FROM travelers;

-- Add overnight_hotel column if it doesn't exist
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS overnight_hotel BOOLEAN DEFAULT FALSE;

-- Insert the exact traveler data from PDF with overnight hotel flags
INSERT INTO travelers (name, flight_number, departure_time, checked_in, overnight_hotel) VALUES
-- Alaska Airlines 66 - August 10, 10:33pm (Regular travelers)
('Herry Saputra', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Putu Sonny', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Hermie Tresvalles', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Nino Dalawampu', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Roger Bermudeds', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Marlyd Fianan', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Terence Mirandilla', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Darwin Moliski', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Randy Rabadon', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('I Kadek Arnata', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Ray John Lopera', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Leo Reyes Jr', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Wilmer Lucas', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),
('Chrisopher Rosel', 'Alaska Airlines 66', 'August 10, 10:33pm', false, false),

-- Alaska Airlines 42 - August 11, 5:23am
('Sachin Gigool', 'Alaska Airlines 42', 'August 11, 5:23am', false, false),

-- Overnight Hotel guests (Alaska Airlines 66)
('Ramatoulie Badjie', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Sherl Furtado', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Charlin Heritiana', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Jacqueline Mokoena', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Wellesly Coelho', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Dilu Roy', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Andrea Tapia Nolivos', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true),
('Armando Viccina Salazar', 'Alaska Airlines 66', 'August 10, 10:33pm', false, true);
