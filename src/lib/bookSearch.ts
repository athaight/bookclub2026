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

// Open Library API search
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,author_alternative_name,cover_i,isbn,key,subject`
    );

    if (!response.ok) {
      throw new Error('Open Library API error');
    }

    const data = await response.json();

    return data.docs.slice(0, 8).map((doc: any) => ({
      title: doc.title || 'Unknown Title',
      author: doc.author_name?.[0] || doc.author_alternative_name?.[0] || 'Unknown Author',
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
      isbn: doc.isbn?.[0],
      key: doc.key,
      genre: pickBestGenre(doc.subject),
    }));
  } catch (error) {
    console.warn('Open Library search failed:', error);
    
    // Fallback to Google Books
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      const url = apiKey 
        ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&key=${apiKey}`
        : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`;
      
      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return (data.items || []).map((item: any) => ({
        title: item.volumeInfo.title || 'Unknown Title',
        author: item.volumeInfo.authors?.[0] || 'Unknown Author',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail,
        isbn: item.volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
        genre: pickBestGenre(item.volumeInfo.categories),
      }));
    } catch {
      return [];
    }
  }
}
