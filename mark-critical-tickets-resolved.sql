-- Mark the 4 critical tickets as resolved after merging feature branches
-- Run this after merging: rate-limiting, input-validation, error-monitoring, automated-testing

UPDATE tickets 
SET 
  status = 'resolved',
  stage = 'done',
  resolved_at = NOW(),
  updated_at = NOW()
WHERE title IN (
  'Implement API Rate Limiting',
  'Add Input Validation with Zod',
  'Install Sentry Error Tracking',
  'Set Up Automated Testing with Vitest'
)
AND status != 'resolved';

-- Show what was updated
SELECT id, title, status, stage, resolved_at 
FROM tickets 
WHERE title IN (
  'Implement API Rate Limiting',
  'Add Input Validation with Zod',
  'Install Sentry Error Tracking',
  'Set Up Automated Testing with Vitest'
)
ORDER BY title;
