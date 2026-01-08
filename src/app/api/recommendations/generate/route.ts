import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getUserReadingData, formatReadingDataForPrompt } from '@/lib/getReadingData';
import { validateBooks, isBookAlreadyOwned } from '@/lib/bookValidation';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export interface GenerateRequest {
  userId: string;
  userEmail: string;
  mode: 'instant' | 'conversational';
  includeAllBros: boolean;
  conversationHistory?: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface RecommendationResponse {
  recommendations?: BookRecommendation[];
  question?: string;
  conversationId: string;
  needsMoreInfo: boolean;
  error?: string;
}

export interface BookRecommendation {
  title: string;
  author: string;
  genre?: string;
  coverUrl?: string;
  isbn?: string;
  summary?: string;
  why: string; // Why this matches the user
  readBy?: string[]; // Which Book Bros read this (if applicable)
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { userId, userEmail, mode, includeAllBros, conversationHistory = [] } = body;

    // Validate required fields
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing userId or userEmail' },
        { status: 400 }
      );
    }

    // Get user reading data
    const readingData = await getUserReadingData(userEmail, includeAllBros);
    
    if (readingData.books.length === 0 && readingData.topTens.length === 0) {
      return NextResponse.json(
        { error: 'No reading data found. Please add some books to your library first!' },
        { status: 400 }
      );
    }

    // Format reading data for Claude
    const readingContext = formatReadingDataForPrompt(readingData);

    // Create or get session
    const sessionId = await createOrGetSession(userId, mode, includeAllBros);

    // Build Claude prompt based on mode and conversation history
    const isFirstInteraction = conversationHistory.length === 0;
    
    if (mode === 'instant' || (mode === 'conversational' && !isFirstInteraction)) {
      // Generate recommendations
      const recommendations = await generateRecommendations(
        readingContext,
        conversationHistory,
        includeAllBros,
        readingData.memberNames
      );

      // Validate recommendations
      const validatedBooks = await validateBooks(
        recommendations.map(r => ({ title: r.title, author: r.author }))
      );

      // Enrich recommendations with validation data
      const enrichedRecommendations: BookRecommendation[] = [];

      for (const validated of validatedBooks) {
        const originalRec = recommendations.find(
          r => r.title === validated.metadata?.title
        );

        // Check which bros read this book (if includeAllBros)
        let readBy: string[] = [];
        if (includeAllBros) {
          readBy = readingData.books
            .filter(b => 
              b.title.toLowerCase() === validated.metadata?.title.toLowerCase() &&
              b.author.toLowerCase().includes(validated.metadata?.author.toLowerCase() || '')
            )
            .map(b => b.memberName || b.memberEmail || '')
            .filter((name, index, self) => self.indexOf(name) === index); // Unique names
        }

        // Check if user already owns this book
        const alreadyOwned = await isBookAlreadyOwned(
          userEmail,
          validated.metadata?.title || '',
          validated.metadata?.author || ''
        );

        // Skip books user already owns
        if (alreadyOwned) continue;

        enrichedRecommendations.push({
          title: validated.metadata?.title || originalRec?.title || '',
          author: validated.metadata?.author || originalRec?.author || '',
          genre: validated.metadata?.genre,
          coverUrl: validated.metadata?.coverUrl,
          isbn: validated.metadata?.isbn,
          summary: validated.metadata?.summary,
          why: originalRec?.why || 'Recommended based on your reading profile',
          readBy: readBy.length > 0 ? readBy : undefined,
        });
      }

      // Store recommendations in database
      await storeRecommendations(sessionId, enrichedRecommendations, conversationHistory);

      // Return final recommendations
      return NextResponse.json({
        recommendations: enrichedRecommendations.slice(0, 5), // Max 5 recommendations
        conversationId: sessionId,
        needsMoreInfo: false,
      });

    } else {
      // Conversational mode - ask a clarifying question
      const question = await askClarifyingQuestion(readingContext);

      // Store conversation
      await storeConversation(sessionId, [
        { role: 'assistant', content: question },
      ]);

      return NextResponse.json({
        question,
        conversationId: sessionId,
        needsMoreInfo: true,
      });
    }

  } catch (error) {
    console.error('=== RECOMMENDATION ERROR ===');
    console.error('Error object:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('========================');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Generate book recommendations using Claude
 */
async function generateRecommendations(
  readingContext: string,
  conversationHistory: Message[],
  includeAllBros: boolean,
  memberNames: { [email: string]: string }
): Promise<Array<{ title: string; author: string; why: string }>> {
  const broNames = Object.values(memberNames).join(', ');
  const conversationContext = conversationHistory.length > 0
    ? `\n\nConversation so far:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
    : '';

  const prompt = `You are a book recommendation expert for a book club called "Book Bros" (members: ${broNames}).

${readingContext}${conversationContext}

Based on this reading profile, recommend 5 books that would be perfect for this reader.

CRITICAL REQUIREMENTS:
1. Only recommend REAL, PUBLISHED books that are widely available (not rare or out of print)
2. Do NOT recommend books already in their library, top tens, or wishlist
3. Match their taste based on genres, ratings, and favorite books
4. Provide a compelling "WHY" for each recommendation (2-3 sentences explaining the match)
5. Consider their reading stats and patterns

${includeAllBros ? 'NOTE: You have access to all Book Bros reading data. Feel free to draw connections between members\' tastes.' : ''}

Return ONLY a JSON array with this exact structure (no markdown, no extra text):
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "why": "Compelling explanation of why this matches their taste..."
  }
]`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse Claude's response
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response (handle potential markdown wrapper)
  let jsonText = content.text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }

  const recommendations = JSON.parse(jsonText);
  return recommendations;
}

/**
 * Ask a clarifying question for conversational mode
 */
async function askClarifyingQuestion(readingContext: string): Promise<string> {
  const prompt = `You are a book recommendation assistant for Book Bros book club.

${readingContext}

This is the first interaction. Ask ONE concise, engaging clarifying question to help narrow down the perfect book recommendation.

Good questions explore:
- Current mood (fast-paced thriller vs. contemplative literary fiction?)
- Desired reading experience (escape reality vs. learn something new?)
- Fiction vs. non-fiction preference
- Length preference (quick read vs. epic saga?)
- Comfort zone vs. something different

Keep it friendly, conversational, and under 2 sentences. Return ONLY the question text (no preamble).`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text.trim();
}

/**
 * Create or get existing recommendation session
 */
async function createOrGetSession(
  userId: string,
  mode: string,
  includeAllBros: boolean
): Promise<string> {
  try {
    // Create new session
    const { data, error } = await supabaseAdmin
      .from('recommendation_sessions')
      .insert({
        user_id: userId,
        preferences: { mode, includeAllBros },
        mode: 'ai',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Store conversation messages
 */
async function storeConversation(
  sessionId: string,
  messages: Message[]
): Promise<void> {
  try {
    await supabaseAdmin.from('recommendation_conversations').insert({
      session_id: sessionId,
      messages: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
}

/**
 * Store recommendation results
 */
async function storeRecommendations(
  sessionId: string,
  recommendations: BookRecommendation[],
  conversationHistory: Message[]
): Promise<void> {
  try {
    // Store conversation if exists
    if (conversationHistory.length > 0) {
      await storeConversation(sessionId, conversationHistory);
    }

    // Store each recommendation
    const inserts = recommendations.map((rec) => ({
      session_id: sessionId,
      book_id: `${rec.title}|${rec.author}`, // Simple ID format
      reason: rec.why,
      saved_to_wishlist: false,
    }));

    await supabaseAdmin.from('recommendation_results').insert(inserts);
  } catch (error) {
    console.error('Error storing recommendations:', error);
  }
}
