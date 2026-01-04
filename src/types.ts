export type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed" | "wishlist";
  title: string;
  author?: string;
  comment?: string;
  cover_url?: string;
  created_at: string;
  completed_at: string | null;
  top_ten?: boolean;
  top_ten_rank?: number | null; // Position in top ten list (1-10)
  in_library?: boolean;
  reading_challenge_year?: number | null; // Year the book was added for reading challenge
  rating?: number | null; // 1-5 star rating
  genre?: string | null; // Primary genre/subject from book API
};

export type ProfileRow = {
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type BookReportRow = {
  id: string;
  user_email: string;
  title: string;
  book_title: string;
  book_author?: string | null;
  book_cover_url?: string | null;
  content: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export type BookOfTheMonthRow = {
  id: string;
  year_month: string; // Format: "2026-01"
  picker_email: string;
  book_title: string;
  book_author: string;
  book_cover_url?: string | null;
  book_summary?: string | null;
  book_genre?: string | null;
  why_picked?: string | null;
  created_at: string;
  updated_at: string;
};