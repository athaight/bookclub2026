-- Book Comments Feature for Library Books
-- Run this in Supabase SQL Editor

-- Main comments table for library books
CREATE TABLE IF NOT EXISTS book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Use a unique identifier for the book (title + author combination hash or the book id)
  book_identifier TEXT NOT NULL, -- We'll use "title::author" as identifier
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES book_comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_book_comments_book ON book_comments(book_identifier);
CREATE INDEX IF NOT EXISTS idx_book_comments_parent ON book_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_author ON book_comments(author_email);

-- Emoji reactions table
CREATE TABLE IF NOT EXISTS book_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  emoji TEXT NOT NULL, -- Store the emoji character
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_email, emoji) -- One reaction type per user per comment
);

CREATE INDEX IF NOT EXISTS idx_book_reactions_comment ON book_comment_reactions(comment_id);

-- User mentions/tags table
CREATE TABLE IF NOT EXISTS book_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES book_comments(id) ON DELETE CASCADE,
  mentioned_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_mentions_comment ON book_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_book_mentions_user ON book_comment_mentions(mentioned_email);

-- Enable RLS
ALTER TABLE book_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_comments
-- Anyone can read comments (public)
CREATE POLICY "Anyone can read book comments"
  ON book_comments FOR SELECT
  USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert book comments"
  ON book_comments FOR INSERT
  WITH CHECK (true);

-- Users can update their own comments
CREATE POLICY "Users can update own book comments"
  ON book_comments FOR UPDATE
  USING (author_email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (author_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Users can delete their own comments
CREATE POLICY "Users can delete own book comments"
  ON book_comments FOR DELETE
  USING (author_email = current_setting('request.jwt.claims', true)::json->>'email');

-- RLS Policies for reactions
CREATE POLICY "Anyone can read book reactions"
  ON book_comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert book reactions"
  ON book_comment_reactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own book reactions"
  ON book_comment_reactions FOR DELETE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- RLS Policies for mentions
CREATE POLICY "Anyone can read book mentions"
  ON book_comment_mentions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert book mentions"
  ON book_comment_mentions FOR INSERT
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_book_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS book_comments_updated_at ON book_comments;
CREATE TRIGGER book_comments_updated_at
  BEFORE UPDATE ON book_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_book_comment_updated_at();
