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

// Individual rating source
export interface RatingSource {
  source: 'openLibrary' | 'googleBooks' | 'nyTimes' | 'bookBros';
  rating?: number; // 0-5 scale
  ratingsCount?: number;
  label: string;
  url?: string; // Link to the rating source
}

// Extended book details including summary/description
export interface BookDetails extends BookSearchResult {
  summary?: string;
  ratingsSources?: RatingSource[]; // Individual ratings from each source
  nytReviewUrl?: string; // NY Times review link if available
}

// Fetch detailed book info including summary from Open Library
export async function getBookDetails(book: BookSearchResult): Promise<BookDetails> {
  const ratingsSources: RatingSource[] = [];
  let result: BookDetails = { ...book };
  
  const searchQuery = `${book.title} ${book.author || ''}`.trim();
  let workKey = book.key;
  
  // Temporary storage for data from each source (to merge after parallel fetch)
  let openLibrarySummary: string | undefined;
  let openLibraryGenre: string | undefined;
  let googleBooksSummary: string | undefined;
  let googleBooksGenre: string | undefined;
  let googleBooksPages: number | undefined;
  let nytSummary: string | undefined;
  
  // Helper to safely fetch with timeout
  const fetchWithTimeout = async (url: string, timeoutMs: number = 5000): Promise<Response | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  try {
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
    const nytApiKey = process.env.NEXT_PUBLIC_NYTIMES_API_KEY;
    
    // Fetch all sources in parallel
    const googleUrl = googleApiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1&key=${googleApiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1`;
    
    const fetchPromises: Promise<void>[] = [];
    
    // Google Books
    fetchPromises.push((async () => {
      try {
        const googleResponse = await fetchWithTimeout(googleUrl, 5000);
        if (googleResponse?.ok) {
          const googleData = await googleResponse.json();
          const item = googleData.items?.[0];
          if (item?.volumeInfo) {
            googleBooksSummary = item.volumeInfo.description;
            googleBooksGenre = pickBestGenre(item.volumeInfo.categories);
            googleBooksPages = item.volumeInfo.pageCount || undefined;
            
            if (item.volumeInfo.averageRating) {
              ratingsSources.push({
                source: 'googleBooks',
                rating: item.volumeInfo.averageRating,
                ratingsCount: item.volumeInfo.ratingsCount,
                label: 'Google Books',
                url: item.volumeInfo.infoLink || `https://books.google.com/books?id=${item.id}`,
              });
            }
          }
        }
      } catch { /* ignore */ }
    })());
    
    // NY Times
    if (nytApiKey) {
      fetchPromises.push((async () => {
        try {
          const nytUrl = `https://api.nytimes.com/svc/books/v3/reviews.json?title=${encodeURIComponent(book.title)}&api-key=${nytApiKey}`;
          const nytResponse = await fetchWithTimeout(nytUrl, 5000);
          if (nytResponse?.ok) {
            const nytData = await nytResponse.json();
            const review = nytData.results?.[0];
            if (review) {
              result.nytReviewUrl = review.url;
              nytSummary = review.summary;
              ratingsSources.push({
                source: 'nyTimes',
                label: 'NY Times',
                url: review.url,
              });
            }
          }
        } catch { /* ignore */ }
      })());
    }
    
    // Open Library search + work details
    if (!workKey) {
      fetchPromises.push((async () => {
        try {
          const searchResponse = await fetchWithTimeout(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=1&fields=key,title,author_name,ratings_average,ratings_count`,
            5000
          );
          if (searchResponse?.ok) {
            const searchData = await searchResponse.json();
            if (searchData.docs?.[0]) {
              workKey = searchData.docs[0].key;
              if (searchData.docs[0].ratings_average) {
                ratingsSources.push({
                  source: 'openLibrary',
                  rating: searchData.docs[0].ratings_average,
                  ratingsCount: searchData.docs[0].ratings_count,
                  label: 'Open Library',
                  url: `https://openlibrary.org${workKey}`,
                });
              }
              
              // Also fetch work details now that we have the key
              try {
                const workResponse = await fetchWithTimeout(`https://openlibrary.org${workKey}.json`, 4000);
                if (workResponse?.ok) {
                  const workData = await workResponse.json();
                  if (workData.description) {
                    openLibrarySummary = typeof workData.description === 'string' 
                      ? workData.description 
                      : workData.description.value;
                  }
                  openLibraryGenre = pickBestGenre(workData.subjects);
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore */ }
      })());
    } else {
      // We already have a key, fetch work details and ratings in parallel
      fetchPromises.push((async () => {
        try {
          const workResponse = await fetchWithTimeout(`https://openlibrary.org${workKey}.json`, 5000);
          if (workResponse?.ok) {
            const workData = await workResponse.json();
            if (workData.description) {
              openLibrarySummary = typeof workData.description === 'string' 
                ? workData.description 
                : workData.description.value;
            }
            openLibraryGenre = pickBestGenre(workData.subjects);
          }
        } catch { /* ignore */ }
      })());
      
      fetchPromises.push((async () => {
        try {
          const ratingsResponse = await fetchWithTimeout(`https://openlibrary.org${workKey}/ratings.json`, 5000);
          if (ratingsResponse?.ok) {
            const ratingsData = await ratingsResponse.json();
            if (ratingsData.summary?.average) {
              ratingsSources.push({
                source: 'openLibrary',
                rating: ratingsData.summary.average,
                ratingsCount: ratingsData.summary.count,
                label: 'Open Library',
                url: `https://openlibrary.org${workKey}`,
              });
            }
          }
        } catch { /* ignore */ }
      })());
    }
    
    // Wait for all parallel fetches
    await Promise.all(fetchPromises);
    
    // MERGE DATA with priority: Open Library > Google Books > NY Times
    // Summary priority: Open Library (most detailed) > Google Books > NY Times
    result.summary = openLibrarySummary || googleBooksSummary || nytSummary || result.summary;
    
    // Genre priority: Open Library > Google Books
    result.genre = result.genre || openLibraryGenre || googleBooksGenre;
    
    // Pages: Google Books often has this
    result.pages = result.pages || googleBooksPages;
    
    // PHASE 2: Fallback for summary if still missing - try ISBN lookup
    if (!result.summary && book.isbn) {
      try {
        const isbnResponse = await fetchWithTimeout(`https://openlibrary.org/isbn/${book.isbn}.json`, 4000);
        if (isbnResponse?.ok) {
          const isbnData = await isbnResponse.json();
          if (isbnData.description) {
            result.summary = typeof isbnData.description === 'string'
              ? isbnData.description
              : isbnData.description.value;
          }
        }
      } catch { /* ignore */ }
    }
    
    // Calculate combined rating from available sources
    const numericRatings = ratingsSources.filter(r => r.rating !== undefined);
    if (numericRatings.length > 0) {
      let totalWeight = 0;
      let weightedSum = 0;
      let totalCount = 0;
      
      for (const source of numericRatings) {
        const weight = source.ratingsCount || 1;
        weightedSum += (source.rating || 0) * weight;
        totalWeight += weight;
        totalCount += source.ratingsCount || 0;
      }
      
      result.rating = weightedSum / totalWeight;
      result.ratingsCount = totalCount;
    }
    
    result.ratingsSources = ratingsSources;
    return result;
  } catch (error) {
    console.warn('Failed to fetch book details:', error);
    return { ...book, ratingsSources };
  }
}

// Fetch from NY Times Bestseller lists (useful for book discovery)
export async function getNYTimesBestsellers(listName: string = 'hardcover-fiction'): Promise<BookSearchResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_NYTIMES_API_KEY;
  if (!apiKey) {
    console.warn('NY Times API key not configured');
    return [];
  }
  
  try {
    const url = `https://api.nytimes.com/svc/books/v3/lists/current/${listName}.json?api-key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const books = data.results?.books || [];
    
    return books.map((book: any) => ({
      title: book.title || 'Unknown Title',
      author: book.author || 'Unknown Author',
      coverUrl: book.book_image || undefined,
      isbn: book.primary_isbn13 || book.primary_isbn10,
      genre: listName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      // NY Times provides weeks on list info
      weeksOnList: book.weeks_on_list,
      rank: book.rank,
    }));
  } catch (error) {
    console.warn('Failed to fetch NY Times bestsellers:', error);
    return [];
  }
}
