
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
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<{ id: string, time: number } | null>(null);
  // Fixed: Replaced NodeJS.Timeout with ReturnType<typeof setTimeout> to fix "Cannot find namespace 'NodeJS'" error in browser environments.
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable channel ID for both participants
  const channelId = [currentUser.id, chatUser.id].sort().join(':');

  const markAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', chatUser.id)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      if (error) console.error("Error marking messages as read:", error);
    } catch (err) {
      console.error("Failed to update read status:", err);
    }
  }, [chatUser.id, currentUser.id]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${chatUser.id}),and(sender_id.eq.${chatUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        markAsRead();
      }
    };

    fetchMessages();

    const channel = supabase.channel(`chat:${channelId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as Message;
          const isRelevant = (msg.sender_id === chatUser.id && msg.receiver_id === currentUser.id) || 
                             (msg.sender_id === currentUser.id && msg.receiver_id === chatUser.id);
          
          if (isRelevant) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            if (msg.receiver_id === currentUser.id) {
              markAsRead();
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(m => 
            m.id === updatedMsg.id 
              ? { ...m, ...updatedMsg, reactions: updatedMsg.reactions || m.reactions } 
              : m
          ));
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId === chatUser.id) {
          setIsPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUser.id, chatUser.id, markAsRead, channelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isPartnerTyping]);

  const sendTypingStatus = useCallback(() => {
    supabase.channel(`chat:${channelId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id },
    });
  }, [currentUser.id, channelId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    sendTypingStatus();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const content = newMessage;
    setNewMessage('');

    const tempId = 'temp-' + Math.random().toString(36).substring(7);
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
    
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: chatUser.id,
        content,
        is_read: false,
        reactions: {}
      }).select().single();

      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }

    if (chatUser.id === 'gemini') {
      try {
        // Initialize Gemini AI client with the provided API key from environment variables.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const history = messages.slice(-10).map(msg => ({
          role: msg.sender_id === currentUser.id ? 'user' : 'model' as const,
          parts: [{ text: msg.content }]
        }));
        history.push({ role: 'user', parts: [{ text: content }] });

        // Generate content from the model 'gemini-3-flash-preview' with chat history.
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: history,
          config: {
            systemInstruction: "You are Gemini AI Assistant. Be conversational, helpful, and concise."
          }
        });

        // Extract the generated text from the response using the .text property.
        const aiText = response.text;
        if (aiText) {
          const { data: aiMsg } = await supabase.from('messages').insert({
            sender_id: chatUser.id,
            receiver_id: currentUser.id,
            content: aiText,
            is_read: true,
            reactions: {}
          }).select().single();

          if (aiMsg) {
            setMessages(prev => [...prev, aiMsg]);
          }
        }
      } catch (error) {
        console.error("Gemini API Error:", error);
      }
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const currentReactions = { ...(msg.reactions || {}) };
    const userIds = [...(currentReactions[emoji] || [])];
    
    let newUserIds: string[];
    if (userIds.includes(currentUser.id)) {
      newUserIds = userIds.filter(id => id !== currentUser.id);
    } else {
      newUserIds = [...userIds, currentUser.id];
    }

    if (newUserIds.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = newUserIds;
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: currentReactions } : m));
    setSelectedMsgId(null);

    try {
      const { error } = await supabase
        .from('messages')
        .update({ reactions: currentReactions })
        .eq('id', msgId);
      
      if (error) console.error("Failed to sync reaction:", error);
    } catch (err) {
      console.error("Failed to update reaction:", err);
    }
  };

  const handleMessageClick = (msgId: string) => {
    const now = Date.now();
    if (lastTap.current && lastTap.current.id === msgId && (now - lastTap.current.time) < 300) {
      handleReaction(msgId, '❤️');
      lastTap.current = null;
    } else {
      setSelectedMsgId(selectedMsgId === msgId ? null : msgId);
      lastTap.current = { id: msgId, time: now };
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] dark:bg-slate-950 transition-colors" onClick={() => setSelectedMsgId(null)}>
      <Header 
        title={chatUser.username}
        subtitle={isPartnerTyping ? `${chatUser.username} is typing...` : (chatUser.is_online ? 'Active now' : 'Offline')}
        leftAction={<button onClick={onBack} className="p-2 text-indigo-700 dark:text-indigo-400 active:scale-90 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg></button>}
        rightAction={<Avatar name={chatUser.username} imageUrl={chatUser.avatar_url} isOnline={chatUser.is_online} size="sm" />}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, index) => {
          const isMine = msg.sender_id === currentUser.id;
          const reactions = msg.reactions || {};
          const hasReactions = Object.keys(reactions).length > 0;
          const isAtTop = index < 2;

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300 relative`}
            >
              <div 
                className="relative group cursor-pointer max-w-[85%]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMessageClick(msg.id);
                }}
              >
                {/* Emoji Picker */}
                {selectedMsgId === msg.id && (
                  <div className={`absolute z-30 ${isAtTop ? 'top-full mt-2' : '-top-14'} ${isMine ? 'right-0' : 'left-0'} flex gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-indigo-50 dark:border-slate-800 animate-in zoom-in-75 duration-200 origin-bottom`}>
                    {COMMON_EMOJIS.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                        className={`w-10 h-10 flex items-center justify-center text-xl hover:scale-125 hover:-translate-y-1 active:scale-150 transition-all rounded-xl ${reactions[emoji]?.includes(currentUser.id) ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-500/30' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`px-4 py-2.5 rounded-2xl text-[16px] font-medium leading-relaxed transition-all relative shadow-sm border ${
                  isMine 
                    ? 'bg-indigo-600 text-white border-transparent rounded-tr-none shadow-indigo-200/40 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-800 rounded-tl-none'
                } ${selectedMsgId === msg.id ? 'ring-2 ring-indigo-400/50 scale-[0.98]' : ''}`}>
                  {msg.content}
                  
                  {hasReactions && (
                    <div className={`absolute -bottom-3 ${isMine ? 'right-1' : 'left-1'} flex flex-wrap gap-1 z-10`}>
                      {Object.entries(reactions).map(([emoji, users]) => {
                        const userList = users as string[];
                        const didIReact = userList.includes(currentUser.id);
                        return (
                          <button 
                            key={emoji} 
                            className={`flex items-center gap-1 bg-white dark:bg-slate-800 border rounded-full px-2 py-0.5 shadow-md text-[12px] font-black animate-in zoom-in duration-300 active:scale-125 transition-transform ${didIReact ? 'border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                            onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                          >
                            <span>{emoji}</span>
                            {userList.length > 1 && <span className="text-[10px]">{userList.length}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex items-center gap-1.5 mt-1.5 px-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isMine ? 'text-indigo-400/70 dark:text-indigo-800/80' : 'text-slate-400 dark:text-slate-600'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {isMine && (
                  <div className="flex items-center">
                    {msg.is_read ? (
                      <div className="flex -space-x-1.5">
                        <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isPartnerTyping && (
          <div className="flex items-start animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-950 p-4 pb-12 border-t border-slate-100 dark:border-slate-900 shadow-[0_-8px_30px_rgb(0,0,0,0.02)] dark:shadow-none transition-colors">
        <form onSubmit={handleSend} className="flex gap-2.5 items-center max-w-4xl mx-auto">
          <input 
            type="text" 
            placeholder="Type your message..." 
            value={newMessage} 
            onChange={handleInputChange}
            onFocus={() => setSelectedMsgId(null)}
            className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-full text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()} 
            className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 disabled:scale-100 flex-shrink-0"
          >
            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
