
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  reactions?: Record<string, string[]>; // Maps emoji characters to arrays of user IDs
}

export interface ChatPreview {
  user: User;
  lastMessage?: Message;
}

export interface AuthSession {
  user: User | null;
  loading: boolean;
}

export type AppScreen = 'WELCOME' | 'LOGIN' | 'REGISTER' | 'HOME' | 'CHAT' | 'PROFILE' | 'PEOPLE';
