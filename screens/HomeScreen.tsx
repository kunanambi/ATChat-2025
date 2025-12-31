
import React, { useEffect, useState, useCallback } from 'react';
import { User, ChatPreview, Message } from '../types';
import { supabase } from '../lib/supabase';
import { Avatar, Logo } from '../components/UI';

interface HomeProps {
  onSelectUser: (user: User) => void;
  currentUser: User;
  onEditProfile: () => void;
}

const GEMINI_USER: User = {
  id: 'gemini',
  username: 'Gemini AI Assistant',
  email: 'ai@gemini.com',
  is_online: true,
  last_seen: new Date().toISOString()
};

export const HomeScreen: React.FC<HomeProps> = ({ onSelectUser, currentUser, onEditProfile }) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [recentChats, setRecentChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: online } = await supabase.from('profiles').select('*').neq('id', currentUser.id).eq('is_online', true).limit(10);
      setActiveUsers([GEMINI_USER, ...(online || [])]);

      const { data: messages } = await supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: false });
      if (messages && messages.length > 0) {
        const chatMap = new Map<string, { lastMessage: Message; partnerId: string }>();
        const partnerIds = new Set<string>();
        messages.forEach(msg => {
          const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
          if (!chatMap.has(partnerId)) {
            chatMap.set(partnerId, { lastMessage: msg, partnerId });
            if (partnerId !== 'gemini') partnerIds.add(partnerId);
          }
        });

        let profilesData: User[] = [];
        if (partnerIds.size > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(partnerIds));
          profilesData = profiles || [];
        }

        const sortedChats: ChatPreview[] = Array.from(chatMap.values()).map(item => {
          if (item.partnerId === 'gemini') return { user: GEMINI_USER, lastMessage: item.lastMessage };
          const profile = profilesData.find(p => p.id === item.partnerId);
          return profile ? { user: profile, lastMessage: item.lastMessage } : null;
        }).filter(Boolean) as ChatPreview[];
        setRecentChats(sortedChats);
      }
    } catch (e) {} finally { setLoading(false); }
  }, [currentUser.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-slate-950 transition-colors">
      <div className="px-6 pt-14 pb-6 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-100 dark:border-slate-900 transition-all">
        <div className="flex items-center">
          <div className="flex-shrink-0 -ml-12 -mr-8"><Logo size="sm" showText={true} className="w-32 h-20" /></div>
          <div className="ml-2 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
            <h1 className="text-2xl font-black text-[#1B273F] dark:text-slate-100 tracking-tight leading-none">Chats</h1>
            <p className="text-[10px] font-bold text-[#00D1C1] uppercase tracking-[0.2em] mt-1">Inbox</p>
          </div>
        </div>
        <button onClick={onEditProfile} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-[#1B273F] dark:text-slate-100 shadow-sm border border-slate-100 dark:border-slate-800 active:scale-90 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        </button>
      </div>

      <div className="flex-1 px-6 pb-32">
        <div className="mt-6 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">People Online</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {activeUsers.map((user) => (
              <button key={user.id} onClick={() => onSelectUser(user)} className="flex flex-col items-center gap-2.5 min-w-[72px] active:scale-95 transition-transform">
                <Avatar name={user.username} imageUrl={user.avatar_url} isOnline={user.is_online} size="lg" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate w-16 text-center">{user.username.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Recent Conversations</p>
          {loading && recentChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
               <div className="w-10 h-10 border-4 border-[#00D1C1] border-t-transparent rounded-full animate-spin mb-4"></div>
            </div>
          ) : recentChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-black text-[#1B273F] dark:text-slate-100 text-lg">No chats yet</h3>
            </div>
          ) : (
            recentChats.map((chat) => (
              <button key={chat.user.id} onClick={() => onSelectUser(chat.user)} className="w-full flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.98] group">
                <Avatar name={chat.user.username} imageUrl={chat.user.avatar_url} isOnline={chat.user.is_online} size="lg" />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-black text-[#1B273F] dark:text-slate-100 truncate pr-2 group-hover:text-[#00D1C1]">{chat.user.username}</h3>
                    <span className="text-[11px] font-black text-[#F89D1B] bg-orange-50 dark:bg-orange-900/10 px-2.5 py-1 rounded-lg">
                      {chat.lastMessage ? formatMessageTime(chat.lastMessage.created_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-[13px] line-clamp-1 flex-1 ${chat.lastMessage?.is_read || chat.lastMessage?.sender_id === currentUser.id ? 'text-slate-400' : 'text-[#1B273F] dark:text-slate-100 font-black'}`}>
                      {chat.lastMessage?.sender_id === currentUser.id ? 'You: ' : ''}{chat.lastMessage?.content}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
