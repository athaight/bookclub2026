import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client (bypasses RLS)
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

export interface AddToWishlistRequest {
  userEmail: string;
  bookData: {
    title: string;
    author: string;
    coverUrl?: string;
    genre?: string;
    isbn?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AddToWishlistRequest = await request.json();
    const { userEmail, bookData } = body;

    // Validate required fields
    if (!userEmail || !bookData.title || !bookData.author) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if book already exists in user's books (any status)
    const { data: existingBooks, error: checkError } = await supabaseAdmin
      .from('books')
      .select('id, status')
      .eq('member_email', userEmail)
      .eq('title', bookData.title)
      .eq('author', bookData.author);

    if (checkError) {
      console.error('Error checking existing books:', checkError);
      throw checkError;
    }

    // If book already exists
    if (existingBooks && existingBooks.length > 0) {
      const existing = existingBooks[0];
      
      if (existing.status === 'wishlist') {
        return NextResponse.json({
          success: false,
          message: 'This book is already in your wishlist!',
          alreadyExists: true,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `This book is already in your library (${existing.status})`,
          alreadyExists: true,
        });
      }
    }

    // Add book to wishlist
    const { data: newBook, error: insertError } = await supabaseAdmin
      .from('books')
      .insert({
        member_email: userEmail,
        title: bookData.title,
        author: bookData.author,
        cover_url: bookData.coverUrl,
        genre: bookData.genre,
        status: 'wishlist',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting book:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Book added to wishlist!',
      book: newBook,
    });

  } catch (error) {
    console.error('Wishlist add error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to add book to wishlist',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}