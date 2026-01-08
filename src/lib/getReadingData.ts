// Data collection for Book Discovery recommendations
import { supabase } from '@/lib/supabaseClient';
import { BookRow, ProfileRow } from '@/types';
export interface UserReadingData {
  books: BookData[];
  topTens: BookData[];
  wishlists: BookData[];
  memberNames: { [email: string]: string };
  stats: {
    totalBooksRead: number;
    favoriteGenres: string[];
    averageRating: number;
  };
}

export interface BookData {
  title: string;
  author: string;
  genre?: string;
  rating?: number;
  comment?: string;
  memberEmail?: string; // Which bro read this (for "All Bros" mode)
  memberName?: string;
}

/**
 * Collect user reading data for AI recommendations
 * @param userEmail - Email of the user requesting recommendations
 * @param includeAllBros - Whether to include all Book Bros' data (3 members)
 */
export async function getUserReadingData(
  userEmail: string,
  includeAllBros: boolean
): Promise<UserReadingData> {
  try {
    // Determine which users to fetch data for
    const userEmails = includeAllBros
      ? await getAllBookBrosEmails()
      : [userEmail];

    // Fetch all profiles to get display names
const { data: profiles, error: profileError } = await supabase
  .from('profiles')
  .select('email, display_name')
  .in('email', userEmails);

if (profileError) throw profileError;

// Create email -> name mapping
const memberNames: { [email: string]: string } = {};
profiles?.forEach((profile: { email: string; display_name: string }) => {
  memberNames[profile.email] = profile.display_name;
});

    // Fetch books for these users
    const { data: booksData, error: booksError } = await supabase
      .from('books')
      .select('*')
      .in('member_email', userEmails)
      .order('created_at', { ascending: false });

    if (booksError) throw booksError;

    // Separate books by category
    const books: BookData[] = [];
    const topTens: BookData[] = [];
    const wishlists: BookData[] = [];

    booksData?.forEach((book: BookRow) => {
      const bookData: BookData = {
        title: book.title,
        author: book.author || 'Unknown Author',
        genre: book.genre || undefined,
        rating: book.rating || undefined,
        comment: book.comment || undefined,
        memberEmail: book.member_email,
        memberName: memberNames[book.member_email] || book.member_email,
      };

      // Categorize the book
      if (book.top_ten) {
        topTens.push(bookData);
      } else if (book.status === 'wishlist') {
        wishlists.push(bookData);
      } else if (book.status === 'completed' || book.in_library) {
        books.push(bookData);
      }
    });

    // Sort top tens by rank
    topTens.sort((a, b) => {
      const aRank = booksData?.find(
        (book) => book.title === a.title && book.member_email === a.memberEmail
      )?.top_ten_rank || 999;
      const bRank = booksData?.find(
        (book) => book.title === b.title && book.member_email === b.memberEmail
      )?.top_ten_rank || 999;
      return aRank - bRank;
    });

    // Calculate stats
    const stats = calculateStats(books);

    return {
      books,
      topTens,
      wishlists,
      memberNames,
      stats,
    };
  } catch (error) {
    console.error('Error fetching user reading data:', error);
    // Return empty data on error
    return {
      books: [],
      topTens: [],
      wishlists: [],
      memberNames: {},
      stats: {
        totalBooksRead: 0,
        favoriteGenres: [],
        averageRating: 0,
      },
    };
  }
}

/**
 * Get all Book Bros emails from environment variable
 */
async function getAllBookBrosEmails(): Promise<string[]> {
  try {
    // Parse NEXT_PUBLIC_MEMBERS_JSON from environment
    const membersJson = process.env.NEXT_PUBLIC_MEMBERS_JSON;
    if (!membersJson) {
      console.warn('NEXT_PUBLIC_MEMBERS_JSON not found in environment');
      return [];
    }

    const members = JSON.parse(membersJson);
    return members.map((member: { email: string }) => member.email);
  } catch (error) {
    console.error('Error parsing members JSON:', error);
    return [];
  }
}

/**
 * Calculate reading stats from book data
 */
function calculateStats(books: BookData[]): {
  totalBooksRead: number;
  favoriteGenres: string[];
  averageRating: number;
} {
  const totalBooksRead = books.length;

  // Calculate average rating
  const ratingsOnly = books
    .map((b) => b.rating)
    .filter((r): r is number => r !== undefined && r > 0);
  const averageRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, r) => sum + r, 0) / ratingsOnly.length
      : 0;

  // Count genres
  const genreCounts: { [genre: string]: number } = {};
  books.forEach((book) => {
    if (book.genre) {
      genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
    }
  });

  // Get top 3 genres
  const favoriteGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre);

  return {
    totalBooksRead,
    favoriteGenres,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Format reading data into a prompt-friendly string for Claude
 */
export function formatReadingDataForPrompt(data: UserReadingData): string {
  let prompt = `User Reading Profile:\n\n`;

  // Stats
  prompt += `📊 Reading Stats:\n`;
  prompt += `- Total books read: ${data.stats.totalBooksRead}\n`;
  prompt += `- Average rating: ${data.stats.averageRating}/5 ⭐\n`;
  if (data.stats.favoriteGenres.length > 0) {
    prompt += `- Favorite genres: ${data.stats.favoriteGenres.join(', ')}\n`;
  }
  prompt += `\n`;

  // Top Tens (most important for recommendations)
  if (data.topTens.length > 0) {
    prompt += `🏆 Top Ten Favorite Books:\n`;
    data.topTens.slice(0, 10).forEach((book, index) => {
      prompt += `${index + 1}. "${book.title}" by ${book.author}`;
      if (book.genre) prompt += ` (${book.genre})`;
      if (book.memberName) prompt += ` [Read by: ${book.memberName}]`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  // Recent highly-rated books
  const recentHighRated = data.books
    .filter((b) => b.rating && b.rating >= 4)
    .slice(0, 10);

  if (recentHighRated.length > 0) {
    prompt += `⭐ Recent Highly-Rated Books (4-5 stars):\n`;
    recentHighRated.forEach((book) => {
      prompt += `- "${book.title}" by ${book.author} (${book.rating}/5 ⭐)`;
      if (book.genre) prompt += ` [${book.genre}]`;
      if (book.memberName) prompt += ` [Read by: ${book.memberName}]`;
      if (book.comment) prompt += `\n  💭 "${book.comment}"`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  // Sample of other completed books (for context)
  const otherBooks = data.books
    .filter((b) => !recentHighRated.includes(b))
    .slice(0, 15);

  if (otherBooks.length > 0) {
    prompt += `📚 Other Books Read:\n`;
    otherBooks.forEach((book) => {
      prompt += `- "${book.title}" by ${book.author}`;
      if (book.rating) prompt += ` (${book.rating}/5 ⭐)`;
      if (book.genre) prompt += ` [${book.genre}]`;
      if (book.memberName) prompt += ` [Read by: ${book.memberName}]`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }

  // Wishlist (books they want but haven't read)
  if (data.wishlists.length > 0) {
    prompt += `📋 Wishlist (Books they want to read):\n`;
    data.wishlists.slice(0, 10).forEach((book) => {
      prompt += `- "${book.title}" by ${book.author}`;
      if (book.genre) prompt += ` [${book.genre}]`;
      prompt += `\n`;
    });
  }

  return prompt;
}