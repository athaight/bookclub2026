// Book Discovery Feature Types

export interface RecommendationSession {
  id: string;
  user_id: string; // profiles.id
  preferences: any; // JSON object
  mode: 'ai' | 'manual' | 'collaborative';
  created_at: string;
  expires_at: string;
}

export interface RecommendationConversation {
  id: string;
  session_id: string;
  messages: any; // JSON array of messages
  created_at: string;
}

export interface RecommendationResult {
  id: string;
  session_id: string;
  book_id: string;
  reason?: string;
  saved_to_wishlist: boolean;
  created_at: string;
}
