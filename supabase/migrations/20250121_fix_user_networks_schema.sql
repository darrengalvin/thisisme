-- Fix user_networks table schema to match API expectations
-- This migration ensures the table has the correct column names and structure

-- First, check if the table exists and what columns it has
DO $$
BEGIN
  -- If the table doesn't exist, create it with the correct schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_networks' AND table_schema = 'public') THEN
    CREATE TABLE public.user_networks (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      person_name text NOT NULL,
      person_email text,
      person_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      relationship text,
      notes text,
      photo_url text,
      pending_chapter_invitations jsonb DEFAULT '[]'::jsonb,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    
    -- Create indexes
    CREATE INDEX idx_user_networks_owner ON public.user_networks(owner_id);
    
    -- Enable RLS
    ALTER TABLE public.user_networks ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view own network" ON public.user_networks
      FOR SELECT USING (auth.uid() = owner_id);
    
    CREATE POLICY "Users can manage own network" ON public.user_networks
      FOR ALL USING (auth.uid() = owner_id);
      
  ELSE
    -- Table exists, check if we need to fix column names
    -- Check if user_id column exists (old schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_networks' AND column_name = 'user_id' AND table_schema = 'public') THEN
      -- Rename user_id to owner_id
      ALTER TABLE public.user_networks RENAME COLUMN user_id TO owner_id;
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_networks' AND column_name = 'photo_url' AND table_schema = 'public') THEN
      ALTER TABLE public.user_networks ADD COLUMN photo_url text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_networks' AND column_name = 'pending_chapter_invitations' AND table_schema = 'public') THEN
      ALTER TABLE public.user_networks ADD COLUMN pending_chapter_invitations jsonb DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_networks' AND column_name = 'notes' AND table_schema = 'public') THEN
      ALTER TABLE public.user_networks ADD COLUMN notes text;
    END IF;
    
    -- Ensure RLS is enabled
    ALTER TABLE public.user_networks ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist and recreate them
    DROP POLICY IF EXISTS "Users can view own network" ON public.user_networks;
    DROP POLICY IF EXISTS "Users can manage own network" ON public.user_networks;
    
    -- Create correct RLS policies
    CREATE POLICY "Users can view own network" ON public.user_networks
      FOR SELECT USING (auth.uid() = owner_id);
    
    CREATE POLICY "Users can manage own network" ON public.user_networks
      FOR ALL USING (auth.uid() = owner_id);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.user_networks IS 'Personal contacts for @ tagging in memories';
COMMENT ON COLUMN public.user_networks.owner_id IS 'User who owns this network entry';
COMMENT ON COLUMN public.user_networks.person_user_id IS 'Links to actual user if they join the platform';
COMMENT ON COLUMN public.user_networks.pending_chapter_invitations IS 'Array of chapter IDs that this person has been invited to but has not yet joined';
