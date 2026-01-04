// Book search utilities using Open Library API (primary) and Google Books API (fallback)

export interface BookSearchResult {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  key?: string;
  genre?: string; // Primary genre/subject
}

// Normalize and pick the best genre from a list of subjects
function pickBestGenre(subjects: string[] | undefined): string | undefined {
  if (!subjects || subjects.length === 0) return undefined;
  
  // Common fiction genres we want to prioritize
  const priorityGenres = [
    'science fiction', 'fantasy', 'mystery', 'thriller', 'romance',
    'horror', 'historical fiction', 'literary fiction', 'adventure',
    'young adult', 'children', 'biography', 'memoir', 'history',
    'self-help', 'business', 'psychology', 'philosophy', 'science',
    'technology', 'cooking', 'travel', 'art', 'music', 'poetry',
    'drama', 'comedy', 'crime', 'detective', 'suspense', 'dystopian',
    'classics', 'contemporary', 'graphic novel', 'comics', 'manga',
    'non-fiction', 'fiction', 'novel'
  ];
  
  // Normalize subjects to lowercase for matching
  const normalized = subjects.map(s => s.toLowerCase().trim());
  
  // Try to find a priority genre
  for (const genre of priorityGenres) {
    const match = normalized.find(s => s.includes(genre));
    if (match) {
      // Capitalize first letter of each word
      return match.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  
  // Fall back to first subject if no priority match, but clean it up
  const first = subjects[0];
  // Skip overly specific subjects like "Accessible book" or "Protected DAISY"
  if (first.toLowerCase().includes('accessible') || first.toLowerCase().includes('daisy')) {
    return subjects[1] || undefined;
  }
  return first;
}

// Deduplicate books by title + author (case-insensitive)
function deduplicateBooks(books: BookSearchResult[]): BookSearchResult[] {
  const seen = new Set<string>();
  return books.filter((book) => {
    const key = `${book.title.toLowerCase().trim()}|${(book.author || '').toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Detect if query looks like an author name (2-3 words, no common book words)
function looksLikeAuthorName(query: string): boolean {
  const words = query.trim().split(/\s+/);
  // Author names are typically 2-3 words
  if (words.length < 2 || words.length > 4) return false;
  
  // If query contains common book title words, probably not an author
  const bookWords = ['the', 'of', 'and', 'a', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'book', 'novel', 'story', 'tale', 'guide', 'how', 'what', 'why', 'when', 'where'];
  const lowerQuery = query.toLowerCase();
  const hasBookWord = bookWords.some(w => lowerQuery.split(/\s+/).includes(w));
  
  // If all words are capitalized or look like names, probably an author
  const allCapitalized = words.every(w => /^[A-Z]/.test(w) || w.length <= 2);
  
  return !hasBookWord && (allCapitalized || words.length === 2);
}

// Open Library API search with smart query handling
export interface SearchResults {
  books: BookSearchResult[];
  hasMore: boolean;
  totalFound: number;
}

export async function searchBooks(query: string, options?: { limit?: number; offset?: number }): Promise<SearchResults> {
  if (query.length < 3) {
    return { books: [], hasMore: false, totalFound: 0 };
  }

  const limit = options?.limit ?? 30;
  const offset = options?.offset ?? 0;
  // Fetch more than we need to account for deduplication
  const fetchLimit = Math.min(limit * 2, 100);

  try {
    let results: BookSearchResult[] = [];
    let totalFound = 0;
    const isAuthorSearch = looksLikeAuthorName(query);
    
    if (isAuthorSearch) {
      // Search by author - fetch more results for prolific authors
      const authorResponse = await fetch(
        `https://openlibrary.org/search.json?author=${encodeURIComponent(query)}&limit=${fetchLimit}&offset=${offset}&fields=title,author_name,author_alternative_name,cover_i,isbn,key,subject,first_publish_year&sort=editions`
      );
      
      if (authorResponse.ok) {
        const authorData = await authorResponse.json();
        totalFound = authorData.numFound || 0;
        results = authorData.docs.map((doc: any) => ({
          title: doc.title || 'Unknown Title',
          author: doc.author_name?.[0] || doc.author_alternative_name?.[0] || 'Unknown Author',
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
          isbn: doc.isbn?.[0],
          key: doc.key,
          genre: pickBestGenre(doc.subject),
        }));
      }
    }
    
    // If not author search or author search returned few results, do general search
    if (!isAuthorSearch || results.length < 5) {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${fetchLimit}&offset=${offset}&fields=title,author_name,author_alternative_name,cover_i,isbn,key,subject,first_publish_year`
      );

      if (response.ok) {
        const data = await response.json();
        if (!isAuthorSearch) {
          totalFound = data.numFound || 0;
        }
        const generalResults = data.docs.map((doc: any) => ({
          title: doc.title || 'Unknown Title',
          author: doc.author_name?.[0] || doc.author_alternative_name?.[0] || 'Unknown Author',
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
          isbn: doc.isbn?.[0],
          key: doc.key,
          genre: pickBestGenre(doc.subject),
        }));
        
        // Merge results, preferring author search results if available
        if (isAuthorSearch && results.length > 0) {
          // Add any new books from general search
          results = [...results, ...generalResults];
        } else {
          results = generalResults;
        }
      }
    }
    
    // Deduplicate and limit results
    const dedupedResults = deduplicateBooks(results).slice(0, limit);
    const hasMore = offset + dedupedResults.length < totalFound;
    
    return { books: dedupedResults, hasMore, totalFound };
  } catch (error) {
    console.warn('Open Library search failed:', error);
    
    // Fallback to Google Books (max 40 results)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      const isAuthorSearch = looksLikeAuthorName(query);
      
      // For Google Books, use inauthor: prefix for author searches
      const searchQuery = isAuthorSearch ? `inauthor:${query}` : query;
      const googleLimit = Math.min(limit, 40);
      const url = apiKey 
        ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=${googleLimit}&startIndex=${offset}&key=${apiKey}`
        : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=${googleLimit}&startIndex=${offset}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        return { books: [], hasMore: false, totalFound: 0 };
      }

      const data = await response.json();
      const totalFound = data.totalItems || 0;

      const results = (data.items || []).map((item: any) => ({
        title: item.volumeInfo.title || 'Unknown Title',
        author: item.volumeInfo.authors?.[0] || 'Unknown Author',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail,
        isbn: item.volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
        genre: pickBestGenre(item.volumeInfo.categories),
      }));
      
      const dedupedResults = deduplicateBooks(results).slice(0, limit);
      return { books: dedupedResults, hasMore: offset + dedupedResults.length < totalFound, totalFound };
    } catch {
      return { books: [], hasMore: false, totalFound: 0 };
    }
  }
}
