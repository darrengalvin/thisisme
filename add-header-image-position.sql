-- Add header_image_position column to timezones table
-- This allows users to control vertical positioning of header images (0-100%)
-- Default is 25% (upper portion, great for faces)

ALTER TABLE timezones 
ADD COLUMN IF NOT EXISTS header_image_position INTEGER DEFAULT 25 CHECK (header_image_position >= 0 AND header_image_position <= 100);

-- Add helpful comment
COMMENT ON COLUMN timezones.header_image_position IS 'Vertical position of header image (0=top, 50=center, 100=bottom)';

-- Update existing chapters to have the default position
UPDATE timezones 
SET header_image_position = 25 
WHERE header_image_position IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'timezones' AND column_name = 'header_image_position';

