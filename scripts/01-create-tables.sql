-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create travelers table
CREATE TABLE IF NOT EXISTS travelers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id TEXT, -- Added for unique person identification
  name TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  departure_time TEXT NOT NULL, -- Changed to TEXT to accommodate "TBD" and various formats
  type TEXT NOT NULL CHECK (type IN ('arrival', 'departure', 'cruise')),
  checked_in BOOLEAN DEFAULT FALSE,
  checked_out BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  overnight_hotel BOOLEAN DEFAULT FALSE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- Added for notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for traveler photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('traveler-photos', 'traveler-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;

-- Policy for user_roles
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- New policy: Allow authenticated users to insert their own role
CREATE POLICY "Allow authenticated users to insert their own role" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for travelers
CREATE POLICY "Authenticated users can view travelers" ON travelers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert travelers" ON travelers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update travelers" ON travelers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete travelers" ON travelers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Storage policies
CREATE POLICY "Anyone can view traveler photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'traveler-photos');

CREATE POLICY "Authenticated users can upload traveler photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'traveler-photos' AND auth.role() = 'authenticated');
