// Book search utilities using Open Library API (primary) and Google Books API (fallback)

export interface BookSearchResult {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  key?: string;
  genre?: string; // Primary genre/subject
  pages?: number; // Number of pages
  rating?: number; // Average rating (0-5 scale)
  ratingsCount?: number; // Number of ratings
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
        `https://openlibrary.org/search.json?author=${encodeURIComponent(query)}&limit=${fetchLimit}&offset=${offset}&fields=title,author_name,author_alternative_name,cover_i,isbn,key,subject,first_publish_year,number_of_pages_median,ratings_average,ratings_count&sort=editions`
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
          pages: doc.number_of_pages_median || undefined,
          rating: doc.ratings_average || undefined,
          ratingsCount: doc.ratings_count || undefined,
        }));
      }
    }
    
    // If not author search or author search returned few results, do general search
    if (!isAuthorSearch || results.length < 5) {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${fetchLimit}&offset=${offset}&fields=title,author_name,author_alternative_name,cover_i,isbn,key,subject,first_publish_year,number_of_pages_median,ratings_average,ratings_count`
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
          pages: doc.number_of_pages_median || undefined,
          rating: doc.ratings_average || undefined,
          ratingsCount: doc.ratings_count || undefined,
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
        pages: item.volumeInfo.pageCount || undefined,
        rating: item.volumeInfo.averageRating || undefined,
        ratingsCount: item.volumeInfo.ratingsCount || undefined,
      }));
      
      const dedupedResults = deduplicateBooks(results).slice(0, limit);
      return { books: dedupedResults, hasMore: offset + dedupedResults.length < totalFound, totalFound };
    } catch {
      return { books: [], hasMore: false, totalFound: 0 };
    }
  }
}

// Extended book details including summary/description
export interface BookDetails extends BookSearchResult {
  summary?: string;
}

// Fetch detailed book info including summary from Open Library
export async function getBookDetails(book: BookSearchResult): Promise<BookDetails> {
  try {
    let workKey = book.key;
    
    // If we don't have a key, search for the book to get one
    if (!workKey) {
      try {
        const searchQuery = `${book.title} ${book.author || ''}`.trim();
        const searchResponse = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=1&fields=key,title,author_name,ratings_average,ratings_count`
        );
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.docs?.[0]) {
            workKey = searchData.docs[0].key;
            // Also grab ratings from search if available
            if (searchData.docs[0].ratings_average) {
              book = {
                ...book,
                rating: searchData.docs[0].ratings_average,
                ratingsCount: searchData.docs[0].ratings_count,
              };
            }
          }
        }
      } catch {
        // Ignore search errors, will try Google Books fallback
      }
    }
    
    // If we have a key from Open Library, use it to get the work details
    if (workKey) {
      // The key is like "/works/OL123W" - we need to fetch that endpoint
      const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);
      
      if (workResponse.ok) {
        const workData = await workResponse.json();
        
        // Description can be a string or an object with "value" property
        let summary: string | undefined;
        if (workData.description) {
          summary = typeof workData.description === 'string' 
            ? workData.description 
            : workData.description.value;
        }
        
        // Get genre from subjects if not already present
        const genre = book.genre || pickBestGenre(workData.subjects);
        
        // Fetch ratings if not already present
        let rating = book.rating;
        let ratingsCount = book.ratingsCount;
        if (!rating && workKey) {
          try {
            const ratingsResponse = await fetch(`https://openlibrary.org${workKey}/ratings.json`);
            if (ratingsResponse.ok) {
              const ratingsData = await ratingsResponse.json();
              rating = ratingsData.summary?.average || undefined;
              ratingsCount = ratingsData.summary?.count || undefined;
            }
          } catch {
            // Ignore ratings fetch errors
          }
        }
        
        return {
          ...book,
          summary,
          genre,
          rating,
          ratingsCount,
        };
      }
    }
    
    // Fallback: try Google Books API for description
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
    const searchQuery = `${book.title} ${book.author}`;
    const url = googleApiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1&key=${googleApiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      const item = data.items?.[0];
      
      if (item?.volumeInfo) {
        return {
          ...book,
          summary: item.volumeInfo.description,
          genre: book.genre || pickBestGenre(item.volumeInfo.categories),
          rating: book.rating || item.volumeInfo.averageRating || undefined,
          ratingsCount: book.ratingsCount || item.volumeInfo.ratingsCount || undefined,
        };
      }
    }
    
    return book;
  } catch (error) {
    console.warn('Failed to fetch book details:', error);
    return book;
  }
}
