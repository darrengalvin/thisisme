-- Check if memories have timezone_id set
SELECT 
  id,
  title,
  text_content,
  timezone_id,
  user_id,
  created_at
FROM memories
WHERE user_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
ORDER BY created_at DESC;

-- Also check what timezones/chapters exist
SELECT 
  id,
  title,
  type,
  creator_id
FROM timezones
WHERE creator_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
ORDER BY created_at;

