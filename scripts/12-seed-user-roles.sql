-- Insert roles for existing users based on their email
-- This script assumes 'admin@demo.com' and 'employee@demo.com' users exist in auth.users
-- It will only insert if a role for that user_id does not already exist in user_roles

INSERT INTO user_roles (user_id, role)
SELECT
  u.id,
  CASE
    WHEN u.email = 'admin@demo.com' THEN 'admin'
    WHEN u.email = 'employee@demo.com' THEN 'employee'
    ELSE 'employee' -- Default role for any other existing user
  END
FROM
  auth.users AS u
WHERE
  u.email IN ('admin@demo.com', 'employee@demo.com')
ON CONFLICT (user_id) DO NOTHING; -- Prevents inserting duplicate roles if they already exist

-- You can add more specific users and roles if needed:
-- INSERT INTO user_roles (user_id, role)
-- SELECT u.id, 'admin' FROM auth.users AS u WHERE u.email = 'your_new_admin_email@example.com'
-- ON CONFLICT (user_id) DO NOTHING;
