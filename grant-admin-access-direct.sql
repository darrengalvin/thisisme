-- Grant admin access to dgalvin@yourcaio.co.uk
-- User ID: 9a9c09ee-8d59-450b-bf43-58ee373621b8
-- Run this in your Supabase SQL Editor

-- Update to grant admin access using the user ID
UPDATE users 
SET is_admin = true,
    updated_at = NOW()
WHERE id = '9a9c09ee-8d59-450b-bf43-58ee373621b8';

-- Verify it worked
SELECT id, email, is_admin, created_at 
FROM users 
WHERE id = '9a9c09ee-8d59-450b-bf43-58ee373621b8';

-- Expected result: 
-- id: 9a9c09ee-8d59-450b-bf43-58ee373621b8
-- email: dgalvin@yourcaio.co.uk
-- is_admin: true

