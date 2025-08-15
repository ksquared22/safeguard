-- Clear existing sample data and load the exact traveler list
DELETE FROM travelers;

-- Insert the exact traveler data grouped by flights
INSERT INTO travelers (name, flight_number, checked_in) VALUES
-- China Airlines 21
('I Komang Yasa', 'China Airlines 21', false),
('Rodrigo Quintero', 'China Airlines 21', false),
('Sang Wiriawan', 'China Airlines 21', false),

-- EVA 25
('Christian Marcelo Guerrero', 'EVA 25', false),
('Daniel Marinas', 'EVA 25', false),
('FNU Rianto', 'EVA 25', false),
('Jeremi Canasa', 'EVA 25', false),
('Kristine Castigador', 'EVA 25', false),
('Patricia Formades', 'EVA 25', false),
('Rolly Malveda', 'EVA 25', false),
('Tanya Totana', 'EVA 25', false),

-- British Airways 52
('Devilal Bishnoliya', 'British Airways 52', false),

-- Air France 337
('Sanket Parshivnikar', 'Air France 337', false),

-- Qatar 720
('Abhiram LNU', 'Qatar 720', false),
('Amit Singh', 'Qatar 720', false),
('Marco Lawrence', 'Qatar 720', false),
('Maxwell Gumpo', 'Qatar 720', false),
('Ravindra Mehra', 'Qatar 720', false),

-- Emirates 230
('Yi Zhang', 'Emirates 230', false),
('Zengyue Chen', 'Emirates 230', false);
