-- Book Discovery Feature Migration
-- 1. recommendation_sessions
CREATE TABLE recommendation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferences JSONB,
  mode TEXT NOT NULL CHECK (mode IN ('ai', 'manual', 'collaborative')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- 2. recommendation_conversations
CREATE TABLE recommendation_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES recommendation_sessions(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. recommendation_results
CREATE TABLE recommendation_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES recommendation_sessions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL,
  reason TEXT,
  saved_to_wishlist BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_recommendation_sessions_user_id ON recommendation_sessions(user_id);
CREATE INDEX idx_recommendation_conversations_session_id ON recommendation_conversations(session_id);
CREATE INDEX idx_recommendation_results_session_id ON recommendation_results(session_id);

-- Enable RLS
ALTER TABLE recommendation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only allow users to access their own sessions/conversations/results
CREATE POLICY "Allow user access to own sessions" ON recommendation_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow user access to own conversations" ON recommendation_conversations
  FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM recommendation_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Allow user access to own results" ON recommendation_results
  FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM recommendation_sessions WHERE user_id = auth.uid()));

-- Auto-expire sessions after 30 days (cleanup trigger)
CREATE OR REPLACE FUNCTION delete_expired_recommendation_sessions() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM recommendation_sessions WHERE expires_at < now();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_recommendation_sessions
  AFTER INSERT OR UPDATE ON recommendation_sessions
  FOR EACH STATEMENT EXECUTE FUNCTION delete_expired_recommendation_sessions();
