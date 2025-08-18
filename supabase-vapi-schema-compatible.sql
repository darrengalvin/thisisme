-- VAPI Memory Integration - Supabase Schema (Compatible Version)
-- Run this SQL in your Supabase SQL editor

-- Check existing users table structure first, then create memories table
-- If users table exists with different columns, we'll work with what you have

-- Create memories table for VAPI integration
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500),
  text_content TEXT,
  user_id UUID NOT NULL, -- We'll add the foreign key constraint later if needed
  timezone_id UUID, -- For future group timeline features
  date_precision VARCHAR(20) DEFAULT 'approximate', -- 'exact', 'approximate', 'era'
  approximate_date VARCHAR(100), -- Human description: "Age 25", "Summer 1982", "Early 80s"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media table for photo/video attachments
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'IMAGE', 'VIDEO', 'AUDIO'
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timezones table for group/shared timelines
CREATE TABLE IF NOT EXISTS timezones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'PRIVATE', -- 'PRIVATE', 'GROUP'
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  invite_code VARCHAR(50) UNIQUE,
  creator_id UUID NOT NULL, -- We'll add the foreign key constraint later if needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_approximate_date ON memories(approximate_date);
CREATE INDEX IF NOT EXISTS idx_memories_text_search ON memories USING gin(to_tsvector('english', title || ' ' || COALESCE(text_content, '')));
CREATE INDEX IF NOT EXISTS idx_media_memory_id ON media(memory_id);
CREATE INDEX IF NOT EXISTS idx_timezones_creator_id ON timezones(creator_id);

-- Enable Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE timezones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own memories" ON memories;
DROP POLICY IF EXISTS "Users can insert own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON memories;
DROP POLICY IF EXISTS "Users can view media for own memories" ON media;
DROP POLICY IF EXISTS "Users can insert media for own memories" ON media;
DROP POLICY IF EXISTS "Users can update media for own memories" ON media;
DROP POLICY IF EXISTS "Users can delete media for own memories" ON media;
DROP POLICY IF EXISTS "Users can view own timezones" ON timezones;
DROP POLICY IF EXISTS "Users can insert own timezones" ON timezones;
DROP POLICY IF EXISTS "Users can update own timezones" ON timezones;
DROP POLICY IF EXISTS "Users can delete own timezones" ON timezones;

-- RLS Policies for memories table
CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for media table
CREATE POLICY "Users can view media for own memories" ON media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memories 
      WHERE memories.id = media.memory_id 
      AND memories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert media for own memories" ON media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memories 
      WHERE memories.id = media.memory_id 
      AND memories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update media for own memories" ON media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memories 
      WHERE memories.id = media.memory_id 
      AND memories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete media for own memories" ON media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memories 
      WHERE memories.id = media.memory_id 
      AND memories.user_id = auth.uid()
    )
  );

-- RLS Policies for timezones table
CREATE POLICY "Users can view own timezones" ON timezones
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own timezones" ON timezones
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own timezones" ON timezones
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own timezones" ON timezones
  FOR DELETE USING (auth.uid() = creator_id);

-- Create a test user for VAPI webhook testing (using existing users table structure)
-- First, let's try to insert with just basic fields that likely exist
INSERT INTO users (id, email) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com')
ON CONFLICT (email) DO NOTHING;

-- If your users table has a 'password' column instead of 'password_hash', uncomment this:
-- UPDATE users SET password = 'test-password' WHERE id = 'test-user-456';

-- Create some sample memories for testing
INSERT INTO memories (title, text_content, user_id, approximate_date, date_precision) VALUES
  ('Learning to Drive', 'I was 16 when my dad taught me to drive in our old Honda Civic. I was so nervous but excited at the same time.', '550e8400-e29b-41d4-a716-446655440000', 'Age 16 (around 2006)', 'approximate'),
  ('High School Graduation', 'Graduation day was amazing. All my family was there and I felt so proud walking across that stage.', '550e8400-e29b-41d4-a716-446655440000', 'Age 18 (around 2008)', 'approximate'),
  ('First Job Interview', 'My first real job interview was at a local coffee shop. I was so nervous I spilled coffee on my shirt!', '550e8400-e29b-41d4-a716-446655440000', 'Age 19 (around 2009)', 'approximate')
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_memories_updated_at ON memories;
DROP TRIGGER IF EXISTS update_timezones_updated_at ON timezones;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timezones_updated_at BEFORE UPDATE ON timezones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE memories IS 'Stores user memories captured via VAPI voice assistant';
COMMENT ON COLUMN memories.approximate_date IS 'Human-readable date description like "Age 25", "Summer 1982", "Early childhood"';
COMMENT ON COLUMN memories.date_precision IS 'Indicates how precise the date is: exact, approximate, or era';
COMMENT ON COLUMN memories.text_content IS 'Full memory content including location, people, sensory details';

COMMENT ON TABLE media IS 'Photos, videos, and audio files attached to memories';
COMMENT ON TABLE timezones IS 'Timeline containers for organizing memories by life periods or themes';

-- Show the structure of your existing users table for reference
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
