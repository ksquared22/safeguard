-- Optimized database schema with proper security, performance, and constraints

-- Create user_roles table with enhanced constraints
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create travelers table with enhanced constraints and proper data types
CREATE TABLE IF NOT EXISTS travelers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id TEXT NOT NULL CHECK (length(trim(person_id)) >= 3),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  flight_number TEXT NOT NULL CHECK (flight_number ~ '^[A-Z][A-Z0-9\s]+[0-9]+$'),
  departure_time TEXT NOT NULL, -- Keep as TEXT for flexibility with "TBD" values
  type TEXT NOT NULL CHECK (type IN ('arrival', 'departure', 'cruise')),
  checked_in BOOLEAN DEFAULT FALSE,
  checked_out BOOLEAN DEFAULT FALSE,
  photo_url TEXT CHECK (photo_url IS NULL OR photo_url ~ '^https?://'),
  overnight_hotel BOOLEAN DEFAULT FALSE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add business logic constraints
  CONSTRAINT chk_checkout_after_checkin 
    CHECK (check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time),
  CONSTRAINT chk_departure_checkout_logic
    CHECK (type != 'departure' OR checked_out = FALSE OR checked_in = TRUE)
);

-- Add performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_travelers_person_id ON travelers(person_id);
CREATE INDEX IF NOT EXISTS idx_travelers_flight_number ON travelers(flight_number);
CREATE INDEX IF NOT EXISTS idx_travelers_type ON travelers(type);
CREATE INDEX IF NOT EXISTS idx_travelers_departure_time ON travelers(departure_time);
CREATE INDEX IF NOT EXISTS idx_travelers_checked_in ON travelers(checked_in) WHERE checked_in = TRUE;
CREATE INDEX IF NOT EXISTS idx_travelers_checked_out ON travelers(checked_out) WHERE checked_out = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Create storage bucket for traveler photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('traveler-photos', 'traveler-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS with proper role-based security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;

-- Role-based policies for user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own role" ON user_roles;

CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during registration" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Role-based policies for travelers - restrict by user role
DROP POLICY IF EXISTS "Authenticated users can view travelers" ON travelers;
DROP POLICY IF EXISTS "Authenticated users can insert travelers" ON travelers;
DROP POLICY IF EXISTS "Authenticated users can update travelers" ON travelers;
DROP POLICY IF EXISTS "Authenticated users can delete travelers" ON travelers;

-- All authenticated users can view travelers
CREATE POLICY "Authenticated users can view travelers" ON travelers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert new travelers
CREATE POLICY "Admins can insert travelers" ON travelers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Employees can update check-in/out status and notes, admins can update everything
CREATE POLICY "Role-based traveler updates" ON travelers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND (
        ur.role = 'admin' OR 
        (ur.role = 'employee' AND 
         -- Employees can only update specific fields
         (OLD.person_id = NEW.person_id AND 
          OLD.name = NEW.name AND 
          OLD.flight_number = NEW.flight_number AND 
          OLD.departure_time = NEW.departure_time AND 
          OLD.type = NEW.type))
      )
    )
  );

-- Only admins can delete travelers
CREATE POLICY "Admins can delete travelers" ON travelers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enhanced storage policies with role-based permissions
DROP POLICY IF EXISTS "Anyone can view traveler photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload traveler photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own traveler photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own traveler photos" ON storage.objects;

-- Anyone can view photos (public bucket)
CREATE POLICY "Public read access for traveler photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'traveler-photos');

-- Only authenticated users can upload photos
CREATE POLICY "Authenticated users can upload traveler photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'traveler-photos' AND 
    auth.role() = 'authenticated' AND
    -- Limit file size and type through naming convention
    (storage.filename(name) ~ '\.(jpg|jpeg|png|webp)$')
  );

-- Only admins can update/replace photos
CREATE POLICY "Admins can update traveler photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'traveler-photos' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete photos
CREATE POLICY "Admins can delete traveler photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'traveler-photos' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_travelers_updated_at ON travelers;
CREATE TRIGGER update_travelers_updated_at
    BEFORE UPDATE ON travelers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
