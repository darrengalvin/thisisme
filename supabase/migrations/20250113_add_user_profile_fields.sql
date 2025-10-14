-- Add full_name and profile_photo_url to users table for better collaborative experience
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- Add comments
COMMENT ON COLUMN users.full_name IS 'User''s full name for display in collaborative features';
COMMENT ON COLUMN users.profile_photo_url IS 'URL to user''s profile photo';
COMMENT ON COLUMN users.birth_date IS 'User''s full birth date (can be used alongside or instead of birth_year)';

