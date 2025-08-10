-- Insert sample travelers for testing
INSERT INTO travelers (name, flight_number, departure_time, destination, checked_in) VALUES
('John Smith', 'AA123', NOW() + INTERVAL '2 hours', 'New York, NY', false),
('Sarah Johnson', 'DL456', NOW() + INTERVAL '4 hours', 'Los Angeles, CA', false),
('Mike Wilson', 'UA789', NOW() + INTERVAL '6 hours', 'Chicago, IL', true),
('Emily Davis', 'SW101', NOW() + INTERVAL '8 hours', 'Denver, CO', false),
('David Brown', 'JB202', NOW() + INTERVAL '1 day', 'Boston, MA', false)
ON CONFLICT DO NOTHING;
