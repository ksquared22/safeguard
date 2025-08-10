-- Clear existing data and load the exact PDF data
DELETE FROM travelers;

-- Add departure_time column if it doesn't exist
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS departure_time TEXT;

-- Insert the exact traveler data from PDF
INSERT INTO travelers (name, flight_number, departure_time, checked_in) VALUES
-- China Airlines 21 - August 11, 01:40
('Herry Saputra', 'China Airlines 21', 'August 11, 01:40', false),
('Roger Bermudeds', 'China Airlines 21', 'August 11, 01:40', false),
('Marlyd Fianan', 'China Airlines 21', 'August 11, 01:40', false),
('Terence Mirandilla', 'China Airlines 21', 'August 11, 01:40', false),
('Darwin Moliski', 'China Airlines 21', 'August 11, 01:40', false),
('Randy Rabadon', 'China Airlines 21', 'August 11, 01:40', false),
('Chrisopher Rosel', 'China Airlines 21', 'August 11, 01:40', false),

-- EVA 25 - August 11, 2:10
('Putu Sonny', 'EVA 25', 'August 11, 2:10', false),
('Hermie Tresvalles', 'EVA 25', 'August 11, 2:10', false),
('I Kadek Arnata', 'EVA 25', 'August 11, 2:10', false),
('Ray John Lopera', 'EVA 25', 'August 11, 2:10', false),
('Leo Reyes Jr', 'EVA 25', 'August 11, 2:10', false),
('Wilmer Lucas', 'EVA 25', 'August 11, 2:10', false),
('Nino Dalawampu', 'EVA 25', 'August 11, 2:10', false),

-- Lufthansa 491 - August 11, 2:20
('Sherl Furtado', 'Lufthansa 491', 'August 11, 2:20', false),

-- Qatar 720 - August 11, 4:30
('Dilu Roy', 'Qatar 720', 'August 11, 4:30', false),
('Wellesly Coelho', 'Qatar 720', 'August 11, 4:30', false),

-- Emirates 230 - August 11, 5:15
('Sachin Gigool', 'Emirates 230', 'August 11, 5:15', false),
('Charlin Heritiana', 'Emirates 230', 'August 11, 5:15', false),
('Jacqueline Mokoena', 'Emirates 230', 'August 11, 5:15', false),

-- Turkish 204 - August 11, 7:10
('Ramatoulie Badjie', 'Turkish 204', 'August 11, 7:10', false),

-- Alaska Airlines 363 - August 11, 8:25
('Andrea Tapia Nolivos', 'Alaska Airlines 363', 'August 11, 8:25', false),
('Armando Viccina Salazar', 'Alaska Airlines 363', 'August 11, 8:25', false);
