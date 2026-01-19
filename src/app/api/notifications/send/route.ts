import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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

interface SendNotificationRequest {
  type: 'mention' | 'new_comment';
  recipientEmail: string;
  recipientName: string;
  commenterName: string;
  commenterEmail: string;
  commentPreview: string;
  commentId: string;
  bookTitle: string;
  bookOfMonthId: string;
}

// Book Bros themed email template
function generateEmailHtml({
  recipientName,
  commenterName,
  commentPreview,
  bookTitle,
  bookOfMonthId,
  commentId,
  type,
}: {
  recipientName: string;
  commenterName: string;
  commentPreview: string;
  bookTitle: string;
  bookOfMonthId: string;
  commentId: string;
  type: 'mention' | 'new_comment';
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bookbros.vercel.app';
  const commentLink = `${baseUrl}/book-of-the-month?comment=${commentId}`;
  
  const headerText = type === 'mention' 
    ? `${commenterName} mentioned you in a comment!`
    : `New comment from ${commenterName}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book Bros Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; text-align: center;">
                📚 Book Bros
              </h1>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 8px 0; color: #333333; font-size: 20px; font-weight: 600;">
                Hey ${recipientName}! 👋
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #667eea; font-size: 18px; font-weight: 600;">
                ${headerText}
              </p>
              
              <!-- Book context -->
              <p style="margin: 0 0 16px 0; color: #666666; font-size: 14px;">
                On the journey for <strong style="color: #333333;">"${bookTitle}"</strong>
              </p>
              
              <!-- Comment preview box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #667eea; font-size: 14px; font-weight: 600;">
                  💬 ${commenterName} wrote:
                </p>
                <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.5; font-style: italic;">
                  "${commentPreview.length > 200 ? commentPreview.slice(0, 200) + '...' : commentPreview}"
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${commentLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                  Reply to Comment →
                </a>
              </div>
              
              <p style="margin: 24px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
                You're receiving this because you're a Book Bro! 🎉
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                <a href="${baseUrl}/admin" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    const {
      type,
      recipientEmail,
      recipientName,
      commenterName,
      commenterEmail,
      commentPreview,
      commentId,
      bookTitle,
      bookOfMonthId,
    } = body;

    // Don't send email to yourself
    if (recipientEmail.toLowerCase() === commenterEmail.toLowerCase()) {
      return NextResponse.json({ success: true, skipped: 'self' });
    }

    // Check notification preferences
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_email', recipientEmail.toLowerCase())
      .single();

    // Default preferences if none exist
    const emailOnMention = prefs?.email_on_mention ?? true;
    const emailOnAllComments = prefs?.email_on_all_comments ?? false;

    // Decide whether to send based on preferences
    const shouldSend = 
      (type === 'mention' && emailOnMention) ||
      (type === 'new_comment' && emailOnAllComments);

    if (!shouldSend) {
      return NextResponse.json({ success: true, skipped: 'preferences' });
    }

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return NextResponse.json({ success: true, skipped: 'no_api_key' });
    }

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Book Bros <notifications@bookbros.app>', // You'll need to verify this domain in Resend
      to: recipientEmail,
      subject: type === 'mention' 
        ? `${commenterName} mentioned you in Book Bros! 📚`
        : `New comment on "${bookTitle}" - Book Bros 📚`,
      html: generateEmailHtml({
        recipientName,
        commenterName,
        commentPreview,
        bookTitle,
        bookOfMonthId,
        commentId,
        type,
      }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id });

  } catch (error) {
    console.error('Error in notification endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
