-- =====================================================
-- Add memory_date field to memories table
-- =====================================================
-- This field stores when the actual memory event happened (user-selected date)
-- This is separate from created_at (when the record was created in the system)

-- Add the new column
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS memory_date TIMESTAMP WITH TIME ZONE;

-- Create an index for better query performance on memory_date
CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON memories(memory_date DESC);

-- Update existing memories to use created_at as memory_date if null
-- This preserves the original behavior for existing data
UPDATE memories 
SET memory_date = created_at 
WHERE memory_date IS NULL;

-- Add a comment to clarify the field's purpose
COMMENT ON COLUMN memories.memory_date IS 'The actual date when the memory event occurred (user-selected), distinct from created_at which is when the record was created in the database';

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'memories' 
AND column_name = 'memory_date';

