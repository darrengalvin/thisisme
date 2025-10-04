-- Grant admin access to dgalvin@yourcaio.co.uk
-- Run this in your Supabase SQL Editor

-- First, find the user ID
SELECT id, email, is_admin FROM users WHERE email = 'dgalvin@yourcaio.co.uk';

-- Then update to grant admin access
UPDATE users 
SET is_admin = true,
    updated_at = NOW()
WHERE email = 'dgalvin@yourcaio.co.uk';

-- Verify it worked
SELECT id, email, is_admin FROM users WHERE email = 'dgalvin@yourcaio.co.uk';

-- Expected result: is_admin should be true

