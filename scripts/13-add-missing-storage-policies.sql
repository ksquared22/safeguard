-- Add missing storage policies for the 'traveler-photos' bucket

-- Policy: Anyone can view traveler photos
CREATE POLICY "Anyone can view traveler photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'traveler-photos');

-- Policy: Authenticated users can upload traveler photos
CREATE POLICY "Authenticated users can upload traveler photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'traveler-photos' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can update their own traveler photos (for upsert/overwrite)
-- This policy is important if you allow users to replace existing photos.
CREATE POLICY "Authenticated users can update their own traveler photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'traveler-photos' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can delete their own traveler photos
CREATE POLICY "Authenticated users can delete their own traveler photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'traveler-photos' AND auth.role() = 'authenticated');
