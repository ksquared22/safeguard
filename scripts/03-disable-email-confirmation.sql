-- This script should be run in your Supabase SQL editor to disable email confirmation

-- Update auth settings to disable email confirmation
UPDATE auth.config
SET
  enable_signup = true,
  enable_email_confirmations = false
WHERE true;

-- If the above doesn't work, you can also try this approach:
-- Go to Supabase Dashboard > Authentication > Settings
-- Turn OFF "Enable email confirmations"
-- Turn ON "Enable sign ups"
