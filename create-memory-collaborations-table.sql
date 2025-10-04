-- Create memory_collaborations table to track who has access to which memories
CREATE TABLE IF NOT EXISTS memory_collaborations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions TEXT[] NOT NULL DEFAULT ARRAY['view'], -- Array of permissions: view, comment, add_text, add_images
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique collaboration per memory per user
    UNIQUE(memory_id, collaborator_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memory_collaborations_memory_id ON memory_collaborations(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_collaborations_collaborator_id ON memory_collaborations(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_memory_collaborations_status ON memory_collaborations(status);

-- Add RLS policies
ALTER TABLE memory_collaborations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see collaborations they're involved in (as collaborator or inviter)
CREATE POLICY "Users can view their collaborations" ON memory_collaborations
    FOR SELECT USING (
        collaborator_id = auth.uid() OR 
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM memories 
            WHERE memories.id = memory_collaborations.memory_id 
            AND memories.user_id = auth.uid()
        )
    );

-- Policy: Memory owners can create collaborations
CREATE POLICY "Memory owners can create collaborations" ON memory_collaborations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memories 
            WHERE memories.id = memory_id 
            AND memories.user_id = auth.uid()
        )
    );

-- Policy: Collaborators can update their own collaboration status
CREATE POLICY "Collaborators can update their status" ON memory_collaborations
    FOR UPDATE USING (collaborator_id = auth.uid());

-- Policy: Memory owners can update any collaboration for their memories
CREATE POLICY "Memory owners can update collaborations" ON memory_collaborations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM memories 
            WHERE memories.id = memory_id 
            AND memories.user_id = auth.uid()
        )
    );

-- Add comment to document the table
COMMENT ON TABLE memory_collaborations IS 'Tracks memory collaboration invitations and permissions';
COMMENT ON COLUMN memory_collaborations.permissions IS 'Array of permissions: view, comment, add_text, add_images';
COMMENT ON COLUMN memory_collaborations.status IS 'Invitation status: pending, accepted, declined';
