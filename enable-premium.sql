-- Enable premium status for your account temporarily for testing
UPDATE users 
SET 
  is_premium = true,
  subscription_tier = 'pro',
  subscription_expires_at = NOW() + INTERVAL '1 year'
WHERE email = 'dgalvin@yourcaio.co.uk';

-- Verify the update
SELECT id, email, is_premium, subscription_tier, subscription_expires_at
FROM users 
WHERE email = 'dgalvin@yourcaio.co.uk';

