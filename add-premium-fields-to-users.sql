-- Add premium subscription fields to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS voice_transcription_minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_transcription_minutes_limit INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON users(subscription_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN users.is_premium IS 'Whether the user has an active premium subscription';
COMMENT ON COLUMN users.subscription_tier IS 'The subscription tier: free, pro, or enterprise';
COMMENT ON COLUMN users.subscription_expires_at IS 'When the current subscription expires';
COMMENT ON COLUMN users.subscription_started_at IS 'When the current subscription started';
COMMENT ON COLUMN users.voice_transcription_minutes_used IS 'Total minutes of voice transcription used this billing period';
COMMENT ON COLUMN users.voice_transcription_minutes_limit IS 'Monthly limit for voice transcription in minutes (0 = unlimited for pro)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('is_premium', 'subscription_tier', 'subscription_expires_at');
