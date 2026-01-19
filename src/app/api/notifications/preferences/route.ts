import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for API routes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface NotificationPreferences {
  user_email: string;
  email_on_mention: boolean;
  email_on_all_comments: boolean;
}

// GET - Fetch notification preferences for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_email', userEmail.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    // Return defaults if no preferences exist
    const prefs: NotificationPreferences = data || {
      user_email: userEmail.toLowerCase(),
      email_on_mention: true,
      email_on_all_comments: false,
    };

    return NextResponse.json({ preferences: prefs });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// POST - Update notification preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, emailOnMention, emailOnAllComments } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    // Upsert preferences
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(
        {
          user_email: userEmail.toLowerCase(),
          email_on_mention: emailOnMention ?? true,
          email_on_all_comments: emailOnAllComments ?? false,
        },
        { onConflict: 'user_email' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ preferences: data });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
