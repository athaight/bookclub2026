-- Create book_recommendations table
CREATE TABLE book_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_cover_url TEXT,
  book_genre TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_recommendations_to_email ON book_recommendations(to_email);
CREATE INDEX idx_recommendations_from_email ON book_recommendations(from_email);
CREATE INDEX idx_recommendations_status ON book_recommendations(status);

-- Enable RLS
ALTER TABLE book_recommendations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read recommendations (public viewing)
CREATE POLICY "Allow public read access"
  ON book_recommendations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Users can insert recommendations (they can only recommend as themselves)
CREATE POLICY "Allow insert for authenticated users"
  ON book_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (from_email = auth.jwt()->>'email');

-- Policy: Users can update recommendations sent TO them (to mark as added/dismissed)
CREATE POLICY "Allow update for recipient"
  ON book_recommendations
  FOR UPDATE
  TO authenticated
  USING (to_email = auth.jwt()->>'email');

-- Policy: Users can delete their own sent recommendations
CREATE POLICY "Allow delete for sender"
  ON book_recommendations
  FOR DELETE
  TO authenticated
  USING (from_email = auth.jwt()->>'email');
