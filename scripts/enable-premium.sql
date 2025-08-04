-- Enable premium for specific user
-- Run this in your Supabase SQL editor

-- First, find the user ID for dgalvin@yourcaio.co.uk
SELECT id, email FROM auth.users WHERE email = 'dgalvin@yourcaio.co.uk';

-- Then update or insert the profile with premium status
-- Replace 'USER_ID_HERE' with the actual ID from the query above
INSERT INTO profiles (id, is_premium, subscription_tier, subscription_expires_at, voice_transcription_minutes_limit)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'dgalvin@yourcaio.co.uk'),
    true,
    'pro',
    NOW() + INTERVAL '1 year',
    0  -- 0 means unlimited
)
ON CONFLICT (id) 
DO UPDATE SET 
    is_premium = true,
    subscription_tier = 'pro',
    subscription_expires_at = NOW() + INTERVAL '1 year',
    voice_transcription_minutes_limit = 0;

-- Verify the update
SELECT * FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'dgalvin@yourcaio.co.uk');