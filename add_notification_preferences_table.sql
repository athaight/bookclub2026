-- Notification Preferences for Journey Comments
-- Run this in Supabase SQL Editor

-- User notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  email_on_mention BOOLEAN DEFAULT true,  -- Default ON for mentions
  email_on_all_comments BOOLEAN DEFAULT false,  -- Default OFF for all comments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_email ON notification_preferences(user_email);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read their own preferences
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  USING (true);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (true);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Insert default preferences for existing members (run this after creating the table)
-- You can customize the emails below to match your members
-- INSERT INTO notification_preferences (user_email, email_on_mention, email_on_all_comments)
-- VALUES 
--   ('member1@example.com', true, false),
--   ('member2@example.com', true, false),
--   ('member3@example.com', true, false)
-- ON CONFLICT (user_email) DO NOTHING;
