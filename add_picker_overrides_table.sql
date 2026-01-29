-- Table to track when a user trades/passes their book of the month pick to another user
CREATE TABLE IF NOT EXISTS book_of_month_picker_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL, -- Format: "2026-02"
  original_picker_email TEXT NOT NULL,
  new_picker_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one override per month
  UNIQUE(year_month)
);

-- Enable RLS
ALTER TABLE book_of_month_picker_overrides ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read overrides
CREATE POLICY "Anyone can view picker overrides"
  ON book_of_month_picker_overrides
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update overrides
CREATE POLICY "Authenticated users can create overrides"
  ON book_of_month_picker_overrides
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update overrides"
  ON book_of_month_picker_overrides
  FOR UPDATE
  USING (true);
