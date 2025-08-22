-- Simple conversation save test - automatically gets your user ID

-- Step 1: See your user info
SELECT id, email FROM users ORDER BY created_at DESC LIMIT 3;

-- Step 2: Insert test conversation using the first user
WITH user_info AS (
  SELECT id as user_id FROM users ORDER BY created_at DESC LIMIT 1
)
INSERT INTO conversations (call_id, user_id, started_at) 
SELECT 'test-call-' || EXTRACT(EPOCH FROM NOW()), user_id, NOW()
FROM user_info
RETURNING *;

-- Step 3: Check if it worked
SELECT 
  c.call_id,
  c.started_at,
  u.email as user_email
FROM conversations c
JOIN users u ON c.user_id = u.id
ORDER BY c.started_at DESC
LIMIT 5;
