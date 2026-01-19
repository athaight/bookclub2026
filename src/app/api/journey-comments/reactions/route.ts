import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for API routes (bypasses RLS)
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

// POST - Add a reaction to a comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, userEmail, emoji } = body;

    if (!commentId || !userEmail || !emoji) {
      return NextResponse.json(
        { error: 'commentId, userEmail, and emoji are required' },
        { status: 400 }
      );
    }

    // Insert the reaction (upsert to handle duplicates)
    const { data: reaction, error } = await supabaseAdmin
      .from('journey_comment_reactions')
      .upsert(
        {
          comment_id: commentId,
          user_email: userEmail,
          emoji: emoji,
        },
        { onConflict: 'comment_id,user_email,emoji' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reaction });

  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a reaction from a comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userEmail = searchParams.get('userEmail');
    const emoji = searchParams.get('emoji');

    if (!commentId || !userEmail || !emoji) {
      return NextResponse.json(
        { error: 'commentId, userEmail, and emoji are required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('journey_comment_reactions')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_email', userEmail)
      .eq('emoji', emoji);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
