-- Check if "Working the factories" chapter exists
SELECT 
  id,
  title,
  type,
  creator_id,
  created_at
FROM timezones
WHERE creator_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
  AND title LIKE '%Working%'
ORDER BY created_at;

-- Also check all your chapters
SELECT 
  id,
  title,
  type,
  creator_id,
  created_at
FROM timezones
WHERE creator_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
ORDER BY created_at;

