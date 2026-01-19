-- Journey Comments Feature for Book of the Month
-- Run this in Supabase SQL Editor

-- Main comments table
CREATE TABLE IF NOT EXISTS journey_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_of_month_id UUID NOT NULL REFERENCES book_of_the_month(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES journey_comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_journey_comments_book ON journey_comments(book_of_month_id);
CREATE INDEX IF NOT EXISTS idx_journey_comments_parent ON journey_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_journey_comments_author ON journey_comments(author_email);

-- Emoji reactions table
CREATE TABLE IF NOT EXISTS journey_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES journey_comments(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  emoji TEXT NOT NULL, -- Store the emoji character
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_email, emoji) -- One reaction type per user per comment
);

CREATE INDEX IF NOT EXISTS idx_journey_reactions_comment ON journey_comment_reactions(comment_id);

-- User mentions/tags table
CREATE TABLE IF NOT EXISTS journey_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES journey_comments(id) ON DELETE CASCADE,
  mentioned_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_mentions_comment ON journey_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_journey_mentions_user ON journey_comment_mentions(mentioned_email);

-- Enable RLS
ALTER TABLE journey_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journey_comments
-- Anyone can read comments (public)
CREATE POLICY "Anyone can read journey comments"
  ON journey_comments FOR SELECT
  USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert journey comments"
  ON journey_comments FOR INSERT
  WITH CHECK (true);

-- Users can update their own comments
CREATE POLICY "Users can update own journey comments"
  ON journey_comments FOR UPDATE
  USING (author_email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (author_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Users can delete their own comments
CREATE POLICY "Users can delete own journey comments"
  ON journey_comments FOR DELETE
  USING (author_email = current_setting('request.jwt.claims', true)::json->>'email');

-- RLS Policies for reactions
CREATE POLICY "Anyone can read journey reactions"
  ON journey_comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert journey reactions"
  ON journey_comment_reactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own journey reactions"
  ON journey_comment_reactions FOR DELETE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- RLS Policies for mentions
CREATE POLICY "Anyone can read journey mentions"
  ON journey_comment_mentions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert journey mentions"
  ON journey_comment_mentions FOR INSERT
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_journey_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS journey_comments_updated_at ON journey_comments;
CREATE TRIGGER journey_comments_updated_at
  BEFORE UPDATE ON journey_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_comment_updated_at();
