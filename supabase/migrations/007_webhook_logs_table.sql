-- Create webhook_logs table for persistent VAPI debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_session_id ON webhook_logs(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (for debugging)
CREATE POLICY "Allow all operations for service role" ON webhook_logs
  FOR ALL USING (true);
