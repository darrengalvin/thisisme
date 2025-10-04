-- Update all CLOSED tickets to RESOLVED status
-- This moves them from "Closed" tab to "Resolved" tab

UPDATE public.tickets
SET 
  status = 'resolved',
  resolved_at = COALESCE(resolved_at, updated_at, created_at)
WHERE status = 'closed';

-- Verify the update
SELECT 
  id, 
  title, 
  status, 
  stage,
  resolved_at
FROM public.tickets
WHERE status = 'resolved'
ORDER BY created_at DESC;
