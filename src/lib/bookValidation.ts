// Book validation service - checks if books are real, in-print, and widely available
import { searchBooks, getBookDetails, BookSearchResult, BookDetails } from './bookSearch';

export interface ValidatedBook {
  isValid: boolean;
  isInPrint: boolean;
  isWidelyAvailable: boolean;
  book?: BookDetails;
  metadata?: {
    title: string;
    author: string;
    coverUrl?: string;
    isbn?: string;
    genre?: string;
    summary?: string;
  };
  reason?: string; // Why it failed validation
}

/**
 * Validates if a book is real, in-print, and widely available
 * Uses existing Open Library + Google Books infrastructure
 */
export async function validateBook(
  title: string,
  author: string
): Promise<ValidatedBook> {
  try {
    // Search for the book using our existing search function
    const searchQuery = `${title} ${author}`;
    const searchResults = await searchBooks(searchQuery, { limit: 5 });

    if (!searchResults.books || searchResults.books.length === 0) {
      return {
        isValid: false,
        isInPrint: false,
        isWidelyAvailable: false,
        reason: 'Book not found in Open Library or Google Books',
      };
    }

    // Find best match (exact or close title/author match)
    const bestMatch = findBestMatch(searchResults.books, title, author);

    if (!bestMatch) {
      return {
        isValid: false,
        isInPrint: false,
        isWidelyAvailable: false,
        reason: 'No close match found for title and author',
      };
    }

    // Get detailed info including summary
    const bookDetails = await getBookDetails(bestMatch);

    // Validate availability criteria
    const hasISBN = !!bookDetails.isbn;
    const hasCover = !!bookDetails.coverUrl;
    
    // Books with ISBN and cover images are generally in-print and available
    // This is a heuristic since APIs don't directly provide availability status
    const isInPrint = hasISBN || hasCover;
    const isWidelyAvailable = hasCover; // Books with covers are usually widely distributed

    return {
      isValid: true,
      isInPrint,
      isWidelyAvailable,
      book: bookDetails,
      metadata: {
        title: bookDetails.title,
        author: bookDetails.author,
        coverUrl: bookDetails.coverUrl,
        isbn: bookDetails.isbn,
        genre: bookDetails.genre,
        summary: bookDetails.summary,
      },
    };
  } catch (error) {
    console.error('Book validation error:', error);
    return {
      isValid: false,
      isInPrint: false,
      isWidelyAvailable: false,
      reason: 'Validation service error',
    };
  }
}

/**
 * Batch validate multiple books (useful for AI recommendations)
 * Returns only valid, available books
 */
export async function validateBooks(
  books: Array<{ title: string; author: string }>
): Promise<ValidatedBook[]> {
  const validationPromises = books.map((book) =>
    validateBook(book.title, book.author)
  );

  const results = await Promise.all(validationPromises);

  // Filter to only valid, in-print, widely available books
  return results.filter(
    (result) => result.isValid && result.isInPrint && result.isWidelyAvailable
  );
}

/**
 * Find the best matching book from search results
 * Uses fuzzy matching on title and author
 */
function findBestMatch(
  books: BookSearchResult[],
  targetTitle: string,
  targetAuthor: string
): BookSearchResult | null {
  if (books.length === 0) return null;

  // Normalize strings for comparison
  const normalizeString = (str: string) =>
    str.toLowerCase().trim().replace(/[^\w\s]/g, '');

  const normalizedTargetTitle = normalizeString(targetTitle);
  const normalizedTargetAuthor = normalizeString(targetAuthor);

  // Score each book
  const scoredBooks = books.map((book) => {
    const normalizedBookTitle = normalizeString(book.title);
    const normalizedBookAuthor = normalizeString(book.author || '');

    // Calculate similarity scores (simple word overlap)
    const titleScore = calculateOverlapScore(
      normalizedTargetTitle,
      normalizedBookTitle
    );
    const authorScore = calculateOverlapScore(
      normalizedTargetAuthor,
      normalizedBookAuthor
    );

    // Weighted total score (title is more important)
    const totalScore = titleScore * 0.7 + authorScore * 0.3;

    return { book, totalScore };
  });

  // Sort by score descending
  scoredBooks.sort((a, b) => b.totalScore - a.totalScore);

  // Return best match if score is reasonable (>0.5)
  const best = scoredBooks[0];
  return best.totalScore > 0.5 ? best.book : books[0]; // Fallback to first result
}

/**
 * Simple word overlap score between two strings
 */
function calculateOverlapScore(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((word) => words2.has(word)));

  // Jaccard similarity
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

/**
 * Check if a book is already in user's library or wishlist
 * Useful to avoid duplicate recommendations
 */
export async function isBookAlreadyOwned(
  userEmail: string,
  title: string,
  author: string
): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabaseClient');

    const normalizeString = (str: string) =>
      str.toLowerCase().trim().replace(/[^\w\s]/g, '');

    const normalizedTitle = normalizeString(title);
    const normalizedAuthor = normalizeString(author);

    // Check user's books (library, wishlist, current)
    const { data: books, error } = await supabase
      .from('books')
      .select('title, author')
      .eq('member_email', userEmail);

    if (error) throw error;

    // Check if any book matches (fuzzy match)
    const alreadyOwned = books?.some((book) => {
      const bookTitle = normalizeString(book.title || '');
      const bookAuthor = normalizeString(book.author || '');

      const titleMatch = calculateOverlapScore(normalizedTitle, bookTitle) > 0.7;
      const authorMatch = calculateOverlapScore(normalizedAuthor, bookAuthor) > 0.7;

      return titleMatch && authorMatch;
    });

    return alreadyOwned || false;
  } catch (error) {
    console.error('Error checking if book is owned:', error);
    return false; // Err on the side of allowing recommendations
  }
}