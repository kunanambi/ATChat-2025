
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { Avatar, Logo } from '../components/UI';

interface PeopleProps {
  onSelectUser: (user: User) => void;
  currentUser: User;
}

const GEMINI_USER: User = {
  id: 'gemini',
  username: 'Gemini AI Assistant',
  email: 'ai@gemini.com',
  is_online: true,
  last_seen: new Date().toISOString()
};

export const PeopleScreen: React.FC<PeopleProps> = ({ onSelectUser, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setDbError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });
      
      if (error) {
        setDbError(error.message);
        throw error;
      }

      const otherUsers = (data || [])
        .filter(u => u.id !== currentUser.id)
        .map(u => ({
          ...u,
          username: u.username || u.email?.split('@')[0] || 'Unknown User'
        }));

      setUsers([GEMINI_USER, ...otherUsers]);
    } catch (error: any) {
      console.error("Error fetching people:", error);
      setUsers([GEMINI_USER]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase.channel('global-people-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.channel('global-people-updates').unsubscribe();
    };
  }, [currentUser.id]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors pb-32">
      <div className="px-6 pt-14 pb-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 transition-colors border-b border-slate-100 dark:border-slate-900 animate-fade-in">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 -ml-12 -mr-8">
              <Logo size="sm" showText={true} className="w-32 h-20" />
            </div>
            <div className="ml-2 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
              <h1 className="text-2xl font-black text-[#1B273F] dark:text-slate-100 tracking-tight leading-none">People</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Community Hub</p>
            </div>
          </div>
          <button 
            onClick={fetchUsers}
            className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[#00D1C1] active:rotate-180 transition-all duration-500 shadow-sm border border-slate-100 dark:border-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search all users..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/50 px-12 py-4 rounded-2xl border-none focus:ring-4 focus:ring-teal-500/5 text-sm font-semibold text-gray-700 dark:text-slate-200 transition-all shadow-sm"
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <div className="flex-1 px-6 mt-6 overflow-y-auto">
        {dbError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[1.5rem] flex items-center justify-between animate-fade-in shadow-sm">
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Database Issue</p>
              <p className="text-xs text-red-500 dark:text-red-400 truncate font-medium">{dbError}</p>
            </div>
            <button onClick={fetchUsers} className="text-[10px] font-black text-white bg-red-600 px-4 py-2 rounded-xl shadow-lg shadow-red-500/20 active:scale-90 transition-transform uppercase">Retry</button>
          </div>
        )}

        {loading && users.length === 1 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-[#00D1C1] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-400 font-black uppercase mt-6 tracking-[0.2em] animate-pulse">Scanning Hub...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-50 dark:border-slate-800 shadow-sm">
              <svg className="w-8 h-8 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
            <p className="text-[#1B273F] dark:text-slate-400 font-black">No matches found</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">Try searching for a different username.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-20">
            {filteredUsers.map((user, i) => (
              <button 
                key={user.id} 
                onClick={() => onSelectUser(user)} 
                className="w-full flex items-center gap-4 py-4 px-5 bg-white dark:bg-slate-900 rounded-[2rem] active:bg-teal-50/50 dark:active:bg-teal-900/10 transition-all group animate-slide-in-right opacity-0 border border-slate-50 dark:border-slate-800 shadow-sm"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="relative group-hover:scale-105 transition-transform">
                  <Avatar name={user.username} imageUrl={user.avatar_url} isOnline={user.is_online} size="md" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="font-black text-[#1B273F] dark:text-slate-100 group-active:text-[#00D1C1] transition-colors truncate tracking-tight">
                    {user.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-800'}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {user.is_online ? 'Live Now' : 'Last seen recently'}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 rounded-2xl flex items-center justify-center group-active:bg-[#00D1C1] group-active:text-white transition-all border border-slate-100 dark:border-slate-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path></svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
