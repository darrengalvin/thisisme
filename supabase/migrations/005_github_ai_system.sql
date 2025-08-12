-- GitHub Connections table
CREATE TABLE IF NOT EXISTS github_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  github_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- GitHub Repositories table
CREATE TABLE IF NOT EXISTS github_repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  private BOOLEAN DEFAULT false,
  default_branch TEXT DEFAULT 'main',
  url TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, repo_id)
);

-- AI Analyses table
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  repository TEXT NOT NULL,
  files_analyzed TEXT[],
  analysis_data JSONB NOT NULL,
  confidence_score INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 10,
  is_auto_fixable BOOLEAN DEFAULT false,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_by TEXT DEFAULT 'claude-3.5-sonnet'
);

-- AI Fixes table
CREATE TABLE IF NOT EXISTS ai_fixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES ai_analyses(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  pr_number INTEGER,
  pr_url TEXT,
  branch_name TEXT,
  files_changed TEXT[],
  changes_applied JSONB,
  status TEXT DEFAULT 'pending_review', -- pending_review, approved, merged, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID REFERENCES auth.users(id),
  rollback_data JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_user_id ON github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_ticket_id ON ai_analyses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_fixes_analysis_id ON ai_fixes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_fixes_ticket_id ON ai_fixes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_fixes_status ON ai_fixes(status);

-- Row Level Security
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fixes ENABLE ROW LEVEL SECURITY;

-- GitHub connections policies
CREATE POLICY "Users can view their own GitHub connections"
  ON github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GitHub connections"
  ON github_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GitHub connections"
  ON github_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GitHub connections"
  ON github_connections FOR DELETE
  USING (auth.uid() = user_id);

-- GitHub repositories policies
CREATE POLICY "Users can view their own repositories"
  ON github_repositories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own repositories"
  ON github_repositories FOR ALL
  USING (auth.uid() = user_id);

-- AI analyses policies (admin only for now)
CREATE POLICY "Admins can view all analyses"
  ON ai_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create analyses"
  ON ai_analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- AI fixes policies (admin only for now)
CREATE POLICY "Admins can view all fixes"
  ON ai_fixes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage fixes"
  ON ai_fixes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );