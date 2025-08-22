-- Fix RLS policies for conversation tables
-- These tables need proper policies for the webhook service to save conversations

-- Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversation_messages table  
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversation_embeddings table
ALTER TABLE conversation_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy for conversations: Users can read their own conversations
CREATE POLICY "Users can read own conversations" ON conversations
FOR SELECT USING (user_id = auth.uid());

-- Policy for conversations: Service role can insert conversations (for webhook)
CREATE POLICY "Service role can insert conversations" ON conversations
FOR INSERT WITH CHECK (true);

-- Policy for conversations: Service role can update conversations (for webhook)
CREATE POLICY "Service role can update conversations" ON conversations
FOR UPDATE USING (true);

-- Policy for conversation_messages: Users can read their own messages
CREATE POLICY "Users can read own conversation messages" ON conversation_messages
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- Policy for conversation_messages: Service role can insert messages (for webhook)
CREATE POLICY "Service role can insert conversation messages" ON conversation_messages
FOR INSERT WITH CHECK (true);

-- Policy for conversation_embeddings: Users can read their own embeddings
CREATE POLICY "Users can read own conversation embeddings" ON conversation_embeddings
FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- Policy for conversation_embeddings: Service role can insert embeddings (for webhook)
CREATE POLICY "Service role can insert conversation embeddings" ON conversation_embeddings
FOR INSERT WITH CHECK (true);

-- Grant necessary permissions to service role
GRANT ALL ON conversations TO service_role;
GRANT ALL ON conversation_messages TO service_role;
GRANT ALL ON conversation_embeddings TO service_role;

-- Grant sequence permissions for auto-incrementing IDs (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
