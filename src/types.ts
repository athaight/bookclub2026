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
  in_library?: boolean;
  rating?: number | null; // 1-5 star rating
};

export type ProfileRow = {
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};