-- Test manual conversation saving to debug the issue

-- First, let's see what user IDs we have
SELECT id, email FROM users LIMIT 5;

-- Try to manually insert a test conversation (replace USER_ID with your actual user ID)
-- Get your user ID from the query above, then replace 'YOUR_USER_ID_HERE' below

INSERT INTO conversations (call_id, user_id, started_at) 
VALUES ('test-call-123', 'YOUR_USER_ID_HERE', NOW())
RETURNING *;

-- If the above works, try inserting a test message
-- (Get the conversation ID from the result above)

INSERT INTO conversation_messages (conversation_id, role, content, timestamp)
VALUES (
  (SELECT id FROM conversations WHERE call_id = 'test-call-123'),
  'user',
  'This is a test message',
  NOW()
)
RETURNING *;

-- Check if the data was saved
SELECT 
  c.call_id,
  c.started_at,
  u.email,
  cm.role,
  cm.content
FROM conversations c
JOIN users u ON c.user_id = u.id
LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
ORDER BY c.started_at DESC;
