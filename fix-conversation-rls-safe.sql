-- Safe RLS fix for conversation tables (won't error if policies exist)

-- Enable RLS (safe - won't error if already enabled)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely and recreate them
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can update conversations" ON conversations;
DROP POLICY IF EXISTS "Users can read own conversation messages" ON conversation_messages;
DROP POLICY IF EXISTS "Service role can insert conversation messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can read own conversation embeddings" ON conversation_embeddings;
DROP POLICY IF EXISTS "Service role can insert conversation embeddings" ON conversation_embeddings;

-- Recreate all policies
CREATE POLICY "Users can read own conversations" ON conversations
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can insert conversations" ON conversations
FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update conversations" ON conversations
FOR UPDATE USING (true);

CREATE POLICY "Users can read own conversation messages" ON conversation_messages
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can insert conversation messages" ON conversation_messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own conversation embeddings" ON conversation_embeddings
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can insert conversation embeddings" ON conversation_embeddings
FOR INSERT WITH CHECK (true);

-- Grant permissions (safe - won't error if already granted)
GRANT ALL ON conversations TO service_role;
GRANT ALL ON conversation_messages TO service_role;
GRANT ALL ON conversation_embeddings TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Check what we have after running this
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_messages', 'conversation_embeddings')
ORDER BY tablename, policyname;
