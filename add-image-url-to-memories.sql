-- Add image_url column to memories table
-- This will allow the memory invitation system to include images in invitations

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN memories.image_url IS 'URL to the image associated with this memory for invitations and sharing';
