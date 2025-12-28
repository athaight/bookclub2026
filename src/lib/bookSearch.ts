// Book search utilities using Open Library API (primary) and Google Books API (fallback)

export interface BookSearchResult {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  key?: string;
}

// Open Library API search
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`
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
      }));
    } catch {
      return [];
    }
  }
}
