-- Trigger to automatically propagate cover_url to all books with matching title
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- First, create the trigger function
CREATE OR REPLACE FUNCTION propagate_book_cover()
RETURNS TRIGGER AS $$
BEGIN
  -- Only propagate if cover_url was updated and is not null
  IF NEW.cover_url IS NOT NULL AND (OLD.cover_url IS NULL OR NEW.cover_url != OLD.cover_url) THEN
    -- Update all books with the same title (case-insensitive) to have the same cover
    UPDATE books
    SET cover_url = NEW.cover_url
    WHERE LOWER(title) = LOWER(NEW.title)
      AND id != NEW.id  -- Don't update the book that triggered this
      AND (cover_url IS NULL OR cover_url != NEW.cover_url);  -- Only update if cover is different
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists (so we can recreate it)
DROP TRIGGER IF EXISTS trigger_propagate_book_cover ON books;

-- Create the trigger that fires after insert or update
CREATE TRIGGER trigger_propagate_book_cover
  AFTER INSERT OR UPDATE OF cover_url ON books
  FOR EACH ROW
  EXECUTE FUNCTION propagate_book_cover();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION propagate_book_cover() TO authenticated;
GRANT EXECUTE ON FUNCTION propagate_book_cover() TO anon;
