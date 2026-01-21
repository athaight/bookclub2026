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

export interface BookComment {
  id: string;
  book_identifier: string;
  author_email: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  author_name?: string;
  author_avatar?: string;
  reactions?: ReactionGroup[];
  replies?: BookComment[];
  mentions?: string[];
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[]; // emails of users who reacted
}

// Helper to create book identifier from title and author
export function createBookIdentifier(title: string, author: string): string {
  return `${title.trim().toLowerCase()}::${(author || '').trim().toLowerCase()}`;
}

// GET - Fetch comments for a book
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdentifier = searchParams.get('bookIdentifier');

    if (!bookIdentifier) {
      return NextResponse.json(
        { error: 'bookIdentifier is required' },
        { status: 400 }
      );
    }

    // Fetch all comments for this book (including replies)
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('book_comments')
      .select('*')
      .eq('book_identifier', bookIdentifier)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    // Get all comment IDs
    const commentIds = comments.map(c => c.id);

    // Fetch reactions for all comments
    const { data: reactions, error: reactionsError } = await supabaseAdmin
      .from('book_comment_reactions')
      .select('*')
      .in('comment_id', commentIds);

    if (reactionsError) throw reactionsError;

    // Fetch mentions for all comments
    const { data: mentions, error: mentionsError } = await supabaseAdmin
      .from('book_comment_mentions')
      .select('*')
      .in('comment_id', commentIds);

    if (mentionsError) throw mentionsError;

    // Get unique author emails
    const authorEmails = [...new Set(comments.map(c => c.author_email))];

    // Fetch author profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name, avatar_url')
      .in('email', authorEmails);

    if (profilesError) throw profilesError;

    // Create lookup maps
    const profileMap = new Map(profiles?.map(p => [p.email, p]) || []);
    
    // Group reactions by comment
    const reactionsByComment = new Map<string, ReactionGroup[]>();
    reactions?.forEach(r => {
      if (!reactionsByComment.has(r.comment_id)) {
        reactionsByComment.set(r.comment_id, []);
      }
      const groups = reactionsByComment.get(r.comment_id)!;
      const existingGroup = groups.find(g => g.emoji === r.emoji);
      if (existingGroup) {
        existingGroup.count++;
        existingGroup.users.push(r.user_email);
      } else {
        groups.push({ emoji: r.emoji, count: 1, users: [r.user_email] });
      }
    });

    // Group mentions by comment
    const mentionsByComment = new Map<string, string[]>();
    mentions?.forEach(m => {
      if (!mentionsByComment.has(m.comment_id)) {
        mentionsByComment.set(m.comment_id, []);
      }
      mentionsByComment.get(m.comment_id)!.push(m.mentioned_email);
    });

    // Enrich comments with profile data, reactions, mentions
    const enrichedComments: BookComment[] = comments.map(comment => {
      const profile = profileMap.get(comment.author_email);
      return {
        ...comment,
        author_name: profile?.display_name || comment.author_email.split('@')[0],
        author_avatar: profile?.avatar_url || null,
        reactions: reactionsByComment.get(comment.id) || [],
        mentions: mentionsByComment.get(comment.id) || [],
      };
    });

    // Organize into tree structure (top-level comments with nested replies)
    const topLevelComments = enrichedComments.filter(c => !c.parent_id);
    const repliesMap = new Map<string, BookComment[]>();
    
    enrichedComments.filter(c => c.parent_id).forEach(reply => {
      if (!repliesMap.has(reply.parent_id!)) {
        repliesMap.set(reply.parent_id!, []);
      }
      repliesMap.get(reply.parent_id!)!.push(reply);
    });

    // Attach replies to parent comments
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: repliesMap.get(comment.id) || [],
    }));

    return NextResponse.json({ comments: commentsWithReplies });

  } catch (error) {
    console.error('Error fetching book comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookIdentifier, bookTitle, bookAuthor, authorEmail, content, parentId, mentions } = body;

    if (!bookIdentifier || !authorEmail || !content) {
      return NextResponse.json(
        { error: 'bookIdentifier, authorEmail, and content are required' },
        { status: 400 }
      );
    }

    // Insert the comment
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('book_comments')
      .insert({
        book_identifier: bookIdentifier,
        author_email: authorEmail,
        content: content.trim(),
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (commentError) throw commentError;

    // Insert mentions if any
    if (mentions && mentions.length > 0) {
      const mentionInserts = mentions.map((email: string) => ({
        comment_id: comment.id,
        mentioned_email: email,
      }));

      await supabaseAdmin
        .from('book_comment_mentions')
        .insert(mentionInserts);
    }

    // Fetch author profile for response
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name, avatar_url')
      .eq('email', authorEmail)
      .single();

    const authorName = profile?.display_name || authorEmail.split('@')[0];

    // Send notification emails for mentions (fire and forget)
    const membersJson = process.env.NEXT_PUBLIC_MEMBERS_JSON;
    let allMembers: { email: string; name: string }[] = [];
    try {
      if (membersJson) {
        allMembers = JSON.parse(membersJson);
      }
    } catch (e) {
      console.error('Error parsing members JSON:', e);
    }

    // Send mention notifications
    if (mentions && mentions.length > 0) {
      for (const mentionedEmail of mentions) {
        const member = allMembers.find(m => m.email.toLowerCase() === mentionedEmail.toLowerCase());
        if (member) {
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'mention',
              recipientEmail: mentionedEmail,
              recipientName: member.name,
              commenterName: authorName,
              commenterEmail: authorEmail,
              commentPreview: content.trim(),
              commentId: comment.id,
              bookTitle: bookTitle || 'a book',
              bookOfMonthId: bookIdentifier, // Reusing this field for the link
            }),
          }).catch(err => console.error('Error sending mention notification:', err));
        }
      }
    }

    return NextResponse.json({
      comment: {
        ...comment,
        author_name: authorName,
        author_avatar: profile?.avatar_url || null,
        reactions: [],
        replies: [],
        mentions: mentions || [],
      }
    });

  } catch (error) {
    console.error('Error creating book comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// PUT - Update a comment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, authorEmail, content } = body;

    if (!commentId || !authorEmail || !content) {
      return NextResponse.json(
        { error: 'commentId, authorEmail, and content are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('book_comments')
      .select('author_email')
      .eq('id', commentId)
      .single();

    if (fetchError) throw fetchError;

    if (existing.author_email !== authorEmail) {
      return NextResponse.json(
        { error: 'Not authorized to edit this comment' },
        { status: 403 }
      );
    }

    // Update the comment
    const { data: comment, error: updateError } = await supabaseAdmin
      .from('book_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ comment });

  } catch (error) {
    console.error('Error updating book comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const authorEmail = searchParams.get('authorEmail');

    if (!commentId || !authorEmail) {
      return NextResponse.json(
        { error: 'commentId and authorEmail are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('book_comments')
      .select('author_email')
      .eq('id', commentId)
      .single();

    if (fetchError) throw fetchError;

    if (existing.author_email !== authorEmail) {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete the comment (cascades to reactions and mentions)
    const { error: deleteError } = await supabaseAdmin
      .from('book_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting book comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
