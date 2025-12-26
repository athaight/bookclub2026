export type BookRow = {
  id: string;
  member_email: string;
  status: "current" | "completed";
  title: string;
  created_at: string;
  completed_at: string | null;
};
