export type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed";
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
};

export type ProfileRow = {
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};