-- Create memory_contributions table to store comments, additions, and corrections
-- This table will store all contributions made to memories by collaborators

CREATE TABLE IF NOT EXISTS memory_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('COMMENT', 'ADDITION', 'CORRECTION')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_memory_contributions_memory_id ON memory_contributions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_contributions_contributor_id ON memory_contributions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_memory_contributions_created_at ON memory_contributions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE memory_contributions ENABLE ROW LEVEL SECURITY;

-- Policy for memory owners to see all contributions to their memories
DROP POLICY IF EXISTS "Memory owners can view all contributions" ON memory_contributions;
CREATE POLICY "Memory owners can view all contributions"
ON memory_contributions FOR SELECT
USING (
  memory_id IN (
    SELECT id FROM memories WHERE user_id = auth.uid()
  )
);

-- Policy for collaborators to see contributions to memories they have access to
DROP POLICY IF EXISTS "Collaborators can view contributions" ON memory_contributions;
CREATE POLICY "Collaborators can view contributions"
ON memory_contributions FOR SELECT
USING (
  memory_id IN (
    SELECT mc.memory_id 
    FROM memory_collaborations mc 
    WHERE mc.collaborator_id = auth.uid() 
    AND mc.status = 'accepted'
  )
);

-- Policy for memory owners to insert contributions to their own memories
DROP POLICY IF EXISTS "Memory owners can insert contributions" ON memory_contributions;
CREATE POLICY "Memory owners can insert contributions"
ON memory_contributions FOR INSERT
WITH CHECK (
  memory_id IN (
    SELECT id FROM memories WHERE user_id = auth.uid()
  )
  AND contributor_id = auth.uid()
);

-- Policy for collaborators to insert contributions if they have comment permission
DROP POLICY IF EXISTS "Collaborators can insert contributions" ON memory_contributions;
CREATE POLICY "Collaborators can insert contributions"
ON memory_contributions FOR INSERT
WITH CHECK (
  contributor_id = auth.uid()
  AND memory_id IN (
    SELECT mc.memory_id 
    FROM memory_collaborations mc 
    WHERE mc.collaborator_id = auth.uid() 
    AND mc.status = 'accepted'
    AND 'comment' = ANY(mc.permissions)
  )
);

-- Policy for contributors to update their own contributions
DROP POLICY IF EXISTS "Contributors can update their own contributions" ON memory_contributions;
CREATE POLICY "Contributors can update their own contributions"
ON memory_contributions FOR UPDATE
USING (contributor_id = auth.uid())
WITH CHECK (contributor_id = auth.uid());

-- Policy for contributors to delete their own contributions
DROP POLICY IF EXISTS "Contributors can delete their own contributions" ON memory_contributions;
CREATE POLICY "Contributors can delete their own contributions"
ON memory_contributions FOR DELETE
USING (contributor_id = auth.uid());

-- Policy for memory owners to delete any contributions to their memories
DROP POLICY IF EXISTS "Memory owners can delete contributions" ON memory_contributions;
CREATE POLICY "Memory owners can delete contributions"
ON memory_contributions FOR DELETE
USING (
  memory_id IN (
    SELECT id FROM memories WHERE user_id = auth.uid()
  )
);

-- Add a comment to document the table
COMMENT ON TABLE memory_contributions IS 'Stores comments, additions, and corrections made to memories by collaborators';
COMMENT ON COLUMN memory_contributions.contribution_type IS 'Type of contribution: COMMENT, ADDITION, or CORRECTION';
COMMENT ON COLUMN memory_contributions.content IS 'The actual text content of the contribution';
