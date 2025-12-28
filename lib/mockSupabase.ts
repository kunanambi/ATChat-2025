
import { User, Message } from '../types';

/**
 * Mock Supabase Service
 * Simulates Auth, Database, and Real-time functionality using LocalStorage.
 */

const STORAGE_KEYS = {
  USERS: 'atchat_users',
  MESSAGES: 'atchat_messages',
  CURRENT_USER: 'atchat_current_user'
};

const INITIAL_USERS: User[] = [
  { id: '1', email: 'alex@example.com', username: 'Alex Rivers', is_online: true, last_seen: new Date().toISOString() },
  { id: '2', email: 'sam@example.com', username: 'Sam Smith', is_online: false, last_seen: new Date().toISOString() },
  { id: 'gemini', email: 'ai@gemini.com', username: 'Gemini AI Assistant', is_online: true, last_seen: new Date().toISOString() }
];

const getStoredData = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setStoredData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize app data if empty
if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
  setStoredData(STORAGE_KEYS.USERS, INITIAL_USERS);
}

class MockSupabase {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  // Auth Methods
  async getCurrentUser(): Promise<User | null> {
    return getStoredData<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  async login(email: string): Promise<User> {
    const users = getStoredData<User[]>(STORAGE_KEYS.USERS, []);
    let user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('User not found. Please register.');
    }

    user.is_online = true;
    user.last_seen = new Date().toISOString();
    setStoredData(STORAGE_KEYS.CURRENT_USER, user);
    this.updateUser(user);
    return user;
  }

  async register(username: string, email: string): Promise<User> {
    const users = getStoredData<User[]>(STORAGE_KEYS.USERS, []);
    if (users.some(u => u.email === email)) {
      throw new Error('Email already registered');
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      email,
      is_online: true,
      last_seen: new Date().toISOString()
    };

    setStoredData(STORAGE_KEYS.USERS, [...users, newUser]);
    setStoredData(STORAGE_KEYS.CURRENT_USER, newUser);
    this.notify();
    return newUser;
  }

  async logout() {
    const user = await this.getCurrentUser();
    if (user) {
      user.is_online = false;
      user.last_seen = new Date().toISOString();
      this.updateUser(user);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.notify();
  }

  // User Management
  async getUsers(): Promise<User[]> {
    return getStoredData<User[]>(STORAGE_KEYS.USERS, []);
  }

  async updateUser(updatedUser: User) {
    const users = getStoredData<User[]>(STORAGE_KEYS.USERS, []);
    const newUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setStoredData(STORAGE_KEYS.USERS, newUsers);
    
    const currentUser = await this.getCurrentUser();
    if (currentUser?.id === updatedUser.id) {
      setStoredData(STORAGE_KEYS.CURRENT_USER, updatedUser);
    }
    this.notify();
  }

  // Messaging
  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    const allMessages = getStoredData<Message[]>(STORAGE_KEYS.MESSAGES, []);
    return allMessages.filter(m => 
      (m.sender_id === userId1 && m.receiver_id === userId2) ||
      (m.sender_id === userId2 && m.receiver_id === userId1)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      is_read: false
    };

    const allMessages = getStoredData<Message[]>(STORAGE_KEYS.MESSAGES, []);
    setStoredData(STORAGE_KEYS.MESSAGES, [...allMessages, newMessage]);
    this.notify();

    // Simulate Gemini auto-response if chatting with Gemini
    if (receiverId === 'gemini') {
      setTimeout(() => this.simulateGeminiResponse(senderId), 1000);
    }

    return newMessage;
  }

  private async simulateGeminiResponse(userId: string) {
    const geminiMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender_id: 'gemini',
      receiver_id: userId,
      content: "Hi! I'm your Gemini AI Assistant. I can help you with anything in this chat. How are you today?",
      created_at: new Date().toISOString(),
      is_read: false
    };
    const allMessages = getStoredData<Message[]>(STORAGE_KEYS.MESSAGES, []);
    setStoredData(STORAGE_KEYS.MESSAGES, [...allMessages, geminiMessage]);
    this.notify();
  }
}

export const supabase = new MockSupabase();
