-- Create premium_waitlist table
CREATE TABLE IF NOT EXISTS public.premium_waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow public to insert (for the public waitlist endpoint)
CREATE POLICY "Allow public insert" ON public.premium_waitlist
    FOR INSERT WITH CHECK (true);

-- Allow admins to select, update, delete
CREATE POLICY "Allow admin full access" ON public.premium_waitlist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_premium_waitlist_email ON public.premium_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_premium_waitlist_status ON public.premium_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_premium_waitlist_created_at ON public.premium_waitlist(created_at DESC);
