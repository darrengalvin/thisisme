-- Add more ticket categories for infrastructure/security issues
-- Current: bug, feature, question, improvement
-- Adding: security, performance, monitoring, testing

-- Drop the old constraint
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_category_check;

-- Add new constraint with expanded categories
ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_category_check 
CHECK (category IN (
  'bug', 
  'feature', 
  'question', 
  'improvement',
  'security',
  'performance',
  'monitoring',
  'testing'
));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'tickets_category_check';
