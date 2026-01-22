-- Add pages column to books table
-- This stores the number of pages for each book

ALTER TABLE books 
ADD COLUMN IF NOT EXISTS pages INTEGER;

-- Add a comment for documentation
COMMENT ON COLUMN books.pages IS 'Number of pages in the book, fetched from Open Library or Google Books API';
