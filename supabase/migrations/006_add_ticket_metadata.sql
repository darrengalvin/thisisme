-- Add metadata column to tickets table for storing additional info like screenshots
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add screenshot_url field for quick access to primary screenshot
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Update ticket_attachments to support image types specifically
ALTER TABLE public.ticket_attachments ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'attachment';
ALTER TABLE public.ticket_attachments ADD COLUMN IF NOT EXISTS is_screenshot BOOLEAN DEFAULT false;

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_tickets_metadata ON public.tickets USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_screenshot ON public.ticket_attachments (is_screenshot) WHERE is_screenshot = true;






