
import React, { useEffect, useState } from 'react';
import { User, ChatPreview } from '../types';
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

  const fetchData = async () => {
    try {
      const { data: online } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .eq('is_online', true)
        .limit(10);
      
      setActiveUsers([GEMINI_USER, ...(online || [])]);

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (messages) {
        const chatPartners = new Map<string, ChatPreview>();
        
        for (const msg of messages) {
          const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
          
          if (!chatPartners.has(partnerId)) {
            if (partnerId === 'gemini') {
              chatPartners.set('gemini', { user: GEMINI_USER, lastMessage: msg });
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', partnerId)
                .single();
              
              if (profile) {
                chatPartners.set(partnerId, { user: profile, lastMessage: msg });
              }
            }
          }
        }
        setRecentChats(Array.from(chatPartners.values()));
      }
    } catch (e) {
      console.error("Home fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.channel('home-realtime').unsubscribe();
    };
  }, [currentUser.id]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="px-6 pt-14 pb-6 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 transition-colors animate-fade-in border-b border-slate-100 dark:border-slate-900">
        <div className="flex items-center">
          <div className="flex-shrink-0 -ml-12 -mr-8">
            <Logo size="sm" showText={true} className="w-32 h-20" />
          </div>
          <div className="ml-2 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
            <h1 className="text-2xl font-black text-[#1B273F] dark:text-slate-100 tracking-tight leading-none">Messages</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Dashboard</p>
          </div>
        </div>
        <button 
          onClick={onEditProfile}
          className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-[#1B273F] dark:text-slate-100 shadow-sm active:scale-90 transition-all border border-slate-100 dark:border-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
      </div>

      <div className="px-6 mt-6 mb-8 animate-slide-up stagger-1 opacity-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Online Community</p>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {activeUsers.map((user, i) => (
            <button key={user.id} onClick={() => onSelectUser(user)} className="flex flex-col items-center gap-3 min-w-[72px] active:scale-95 transition-transform animate-scale-up" style={{ animationDelay: `${0.1 + (i * 0.05)}s` }}>
              <Avatar name={user.username} imageUrl={user.avatar_url} isOnline={true} size="lg" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate w-16 text-center">
                {user.username.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pb-32 space-y-4 overflow-y-auto">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Recent Chats</p>
        {recentChats.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm flex items-center justify-center mb-6 border border-slate-50 dark:border-slate-800">
              <svg className="w-10 h-10 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <h3 className="font-black text-[#1B273F] dark:text-slate-100 text-lg">Your inbox is clean</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-[200px] mx-auto font-medium">Start a conversation with anyone from the People tab.</p>
          </div>
        ) : (
          recentChats.map((chat, i) => (
            <button 
              key={chat.user.id} 
              onClick={() => onSelectUser(chat.user)} 
              className="w-full flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2rem] transition-all group animate-slide-up opacity-0 shadow-sm border border-slate-100/50 dark:border-slate-800/50 active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-800/80"
              style={{ animationDelay: `${0.2 + (i * 0.05)}s` }}
            >
              <Avatar name={chat.user.username} imageUrl={chat.user.avatar_url} isOnline={chat.user.is_online} size="lg" className="group-hover:scale-105 transition-transform" />
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-black text-[#1B273F] dark:text-slate-100 truncate pr-2 group-active:text-[#00D1C1] transition-colors">{chat.user.username}</h3>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter">
                    {chat.lastMessage ? new Date(chat.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-[13px] line-clamp-1 flex-1 leading-snug ${!chat.lastMessage?.is_read && chat.lastMessage?.sender_id !== currentUser.id ? 'font-black text-[#1B273F] dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
                    {chat.lastMessage?.sender_id === currentUser.id ? 'You: ' : ''}
                    {chat.lastMessage?.content}
                  </p>
                  {!chat.lastMessage?.is_read && chat.lastMessage?.sender_id !== currentUser.id && (
                    <div className="w-2 h-2 bg-[#00D1C1] rounded-full animate-pulse shadow-lg shadow-teal-500/50 flex-shrink-0" />
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
