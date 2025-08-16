-- Drop existing RLS policies (order matters for dependencies)
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can view travelers" ON travelers;
DROP POLICY IF EXISTS "Authenticated users can insert travelers" ON travelers;
DROP POLICY IF EXISTS "Authenticated users can update travelers" ON travelers;
DROP POLICY IF EXISTS "Authenticated users can delete travelers" ON travelers;
DROP POLICY IF EXISTS "Anyone can view traveler photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload traveler photos" ON storage.objects;

-- Drop tables (order matters for foreign keys)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS travelers CASCADE;

-- Drop storage bucket (if it exists and is empty)
-- NOTE: If the bucket is not empty, this command will fail.
-- You might need to manually empty the 'traveler-photos' bucket in Supabase Storage UI first.
-- Or, if you prefer, you can comment out the line below and just ensure policies are dropped.
-- SELECT storage.delete_bucket('traveler-photos');
