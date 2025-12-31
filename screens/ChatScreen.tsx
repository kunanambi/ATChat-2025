
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Message } from '../types';
import { supabase } from '../lib/supabase';
import { Header, Avatar } from '../components/UI';
import { GoogleGenAI } from "@google/genai";

interface ChatProps {
  currentUser: User;
  chatUser: User;
  onBack: () => void;
}

const COMMON_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export const ChatScreen: React.FC<ChatProps> = ({ currentUser, chatUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [reactingToId, setReactingToId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  const markAsRead = useCallback(async () => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', chatUser.id)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
    } catch (err) {}
  }, [chatUser.id, currentUser.id]);

  const fetchMessages = useCallback(async (isFirstLoad = false) => {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${chatUser.id}),and(sender_id.eq.${chatUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (!isFirstLoad && lastMessageTimeRef.current) {
        query = query.gt('created_at', lastMessageTimeRef.current);
      }

      const { data } = await query;
      
      if (data && data.length > 0) {
        const hasNew = isFirstLoad || data.some(m => !lastMessageTimeRef.current || m.created_at > lastMessageTimeRef.current);

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgsFromUpdate = data.filter(d => !existingIds.has(d.id));
          const updatedMsgs = data.filter(d => existingIds.has(d.id));
          
          let result = [...prev];
          updatedMsgs.forEach(updated => {
            const idx = result.findIndex(m => m.id === updated.id);
            if (idx !== -1) result[idx] = updated;
          });
          
          result = [...result, ...newMsgsFromUpdate].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          lastMessageTimeRef.current = result[result.length - 1].created_at;
          return result;
        });

        if (data.some(m => m.sender_id === chatUser.id)) markAsRead();
        if (hasNew) setTimeout(() => scrollToBottom(isFirstLoad ? 'auto' : 'smooth'), 100);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [currentUser.id, chatUser.id, markAsRead]);

  useEffect(() => {
    fetchMessages(true);
    markAsRead();
    const interval = setInterval(() => fetchMessages(false), 4000); 
    return () => clearInterval(interval);
  }, [fetchMessages, markAsRead]);

  const triggerGeminiResponse = async (userContent: string) => {
    setIsAiTyping(true);
    try {
      // 1. Hakikisha Gemini Profile ipo kwenye database (kuepuka foreign key error)
      await supabase.from('profiles').upsert({
        id: 'gemini',
        username: 'Gemini AI Assistant',
        email: 'ai@gemini.com',
        is_online: true,
        last_seen: new Date().toISOString()
      });

      // 2. Tayarisha historia safi (lazima ianze na 'user' na kufuata mfuatano sahihi)
      const chatHistory: any[] = [];
      const recentMessages = messages.slice(-6).filter(m => !m.id.startsWith('temp-'));
      
      recentMessages.forEach((m, idx) => {
        const role = m.sender_id === currentUser.id ? 'user' : 'model';
        // Hakikisha hatutumi roles mbili zinazofanana mfululizo (API Rule)
        if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].role !== role) {
          chatHistory.push({
            role: role,
            parts: [{ text: m.content }]
          });
        }
      });

      // Lazima iwe mfuatano wa user -> model -> user
      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        // Ikiwa ya mwisho ilikuwa user, Gemini anatarajia iwe ni prompt yetu ya sasa
        chatHistory.pop();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...chatHistory, { role: 'user', parts: [{ text: userContent }] }],
        config: { 
          systemInstruction: "Wewe ni ATChat Assistant rasmi. Jibu kwa Kiswahili na Kiingereza kidogo. Majibu yawe mafupi na ya kirafiki sana." 
        }
      });

      if (response.text) {
        const { error: insertError } = await supabase.from('messages').insert({
          sender_id: 'gemini',
          receiver_id: currentUser.id,
          content: response.text,
          is_read: false,
          reactions: {}
        });

        if (insertError) {
          console.error("Database Insert Error:", insertError);
          // Jaribio la pili bila reactions ikiwa column haipo
          await supabase.from('messages').insert({
            sender_id: 'gemini',
            receiver_id: currentUser.id,
            content: response.text,
            is_read: false
          });
        }
        
        fetchMessages(false);
      }
    } catch (err) {
      console.error("Gemini Assistant Failure:", err);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || isSending) return;
    
    setNewMessage('');
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: chatUser.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      reactions: {}
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(), 10);
    
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: chatUser.id,
        content,
        is_read: false,
        reactions: {}
      }).select().single();

      if (error) {
        if (error.code === '42703' || error.message.includes('reactions')) {
           const { data: fallbackData } = await supabase.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: chatUser.id,
            content,
            is_read: false
          }).select().single();
          
          if (fallbackData) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...fallbackData, reactions: {} } : m));
            lastMessageTimeRef.current = fallbackData.created_at;
          }
        } else throw error;
      } else if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));
        lastMessageTimeRef.current = data.created_at;
      }

      if (chatUser.id === 'gemini') {
        triggerGeminiResponse(content);
      }
    } catch (err: any) {
      console.error("Send error:", err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content); 
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || messageId.startsWith('temp-')) return;

    const currentReactions = { ...(msg.reactions || {}) };
    const userList = (currentReactions[emoji] as string[]) || [];
    const hasReacted = userList.includes(currentUser.id);

    let newUserList = hasReacted ? userList.filter(id => id !== currentUser.id) : [...userList, currentUser.id];
    if (newUserList.length === 0) delete currentReactions[emoji];
    else currentReactions[emoji] = newUserList;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: currentReactions } : m));
    setReactingToId(null);
    try {
      await supabase.from('messages').update({ reactions: currentReactions }).eq('id', messageId);
    } catch (err) {}
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] dark:bg-slate-950 overflow-hidden" onClick={() => setReactingToId(null)}>
      <Header 
        title={chatUser.username}
        subtitle={chatUser.is_online ? '• Online' : '• Offline'}
        leftAction={<button onClick={onBack} className="p-2 text-[#1B273F] dark:text-slate-100"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"></path></svg></button>}
        rightAction={<Avatar name={chatUser.username} imageUrl={chatUser.avatar_url} isOnline={chatUser.is_online} size="sm" />}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser.id;
          const isTemp = msg.id.startsWith('temp-');
          const reactions = msg.reactions || {};
          const reactionEntries = Object.entries(reactions);

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-fade-in relative`}>
              <div className="relative">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTemp) setReactingToId(reactingToId === msg.id ? null : msg.id);
                  }}
                  className={`max-w-[75vw] md:max-w-md px-4 py-3 rounded-2xl text-[15px] font-medium shadow-sm cursor-pointer transition-all active:scale-[0.98] ${
                    isMine ? 'bg-[#00D1C1] text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 text-[#1B273F] dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
                {reactingToId === msg.id && (
                  <div className={`absolute bottom-full mb-2 z-50 flex gap-1 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-scale-up ${isMine ? 'right-0' : 'left-0'}`}>
                    {COMMON_EMOJIS.map(emoji => (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-lg">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {reactionEntries.length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {reactionEntries.map(([emoji, users]) => (
                    <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-all border ${(users as string[]).includes(currentUser.id) ? 'bg-teal-50 dark:bg-teal-900/40 border-[#00D1C1]/30 text-[#00D1C1]' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}>
                      {emoji} {(users as string[]).length > 1 && (users as string[]).length}
                    </button>
                  ))}
                </div>
              )}
              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {isTemp ? 'Sending...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMine && !isTemp && (
                   <svg className={`w-3 h-3 ${msg.is_read ? 'text-[#00D1C1]' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7m-14 6l4 4L19 7" />
                   </svg>
                )}
              </div>
            </div>
          );
        })}

        {isAiTyping && (
          <div className="flex flex-col items-start animate-fade-in">
            <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#00D1C1] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#00D1C1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#00D1C1] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Thinking</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-10 bg-white dark:bg-slate-950 border-t dark:border-slate-900">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto relative">
          <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={isSending} className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-full text-sm font-semibold outline-none border border-slate-200 dark:border-slate-800 focus:border-[#00D1C1] dark:text-white" />
          <button type="submit" disabled={!newMessage.trim() || isSending} className="w-12 h-12 bg-[#00D1C1] text-white rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg">
            {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>}
          </button>
        </form>
      </div>
    </div>
  );
};
