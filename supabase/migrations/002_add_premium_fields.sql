-- Add premium subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS voice_transcription_minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_transcription_minutes_limit INTEGER DEFAULT 0;

-- Create an index for faster premium status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires_at ON profiles(subscription_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_premium IS 'Whether the user has an active premium subscription';
COMMENT ON COLUMN profiles.subscription_tier IS 'The subscription tier: free, pro, or enterprise';
COMMENT ON COLUMN profiles.subscription_expires_at IS 'When the current subscription expires';
COMMENT ON COLUMN profiles.subscription_started_at IS 'When the current subscription started';
COMMENT ON COLUMN profiles.voice_transcription_minutes_used IS 'Total minutes of voice transcription used this billing period';
COMMENT ON COLUMN profiles.voice_transcription_minutes_limit IS 'Monthly limit for voice transcription in minutes (0 = unlimited for pro)';