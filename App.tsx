
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, AppScreen } from './types';
import { supabase } from './lib/supabase';
import { WelcomeScreen, LoginScreen, RegisterScreen } from './screens/AuthScreens';
import { HomeScreen } from './screens/HomeScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PeopleScreen } from './screens/PeopleScreen';
import { BottomNav } from './components/UI';

const CACHE_KEY = 'atchat_profile_cache';
const THEME_KEY = 'atchat_theme_dark';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    return localStorage.getItem(CACHE_KEY) ? 'HOME' : 'WELCOME';
  });
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  
  const authInitialized = useRef(false);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle setting offline when tab is closed
  useEffect(() => {
    const handleTabClose = () => {
      if (user) {
        // Fire and forget
        supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id);
      }
    };
    window.addEventListener('beforeunload', handleTabClose);
    return () => window.removeEventListener('beforeunload', handleTabClose);
  }, [user]);

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profile) {
        const newProfile = {
          id: userId,
          email: email,
          username: email.split('@')[0],
          is_online: true,
          last_seen: new Date().toISOString()
        };
        
        const { data: upserted } = await supabase.from('profiles').upsert(newProfile).select().single();
        if (upserted) {
          setUser(upserted);
          localStorage.setItem(CACHE_KEY, JSON.stringify(upserted));
          return upserted;
        }
        return newProfile;
      }

      setUser(profile);
      localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
      // Update online status in background
      supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', userId);
      return profile;
    } catch (err) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;
    
    const checkSession = async () => {
      const timer = setTimeout(() => setLoading(false), 2500); 
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          localStorage.removeItem(CACHE_KEY);
        }
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
        setCurrentScreen(prev => ['WELCOME', 'LOGIN', 'REGISTER'].includes(prev) ? 'HOME' : prev);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem(CACHE_KEY);
        setCurrentScreen('WELCOME');
        setSelectedChatUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // 1. Try to set offline status, but don't let it block sign out if it's slow
      if (user) {
        try {
          // Send update and wait max 1.5 seconds
          await Promise.race([
            supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
          ]);
        } catch (e) {
          console.warn("Status update timed out, proceeding with logout.");
        }
      }
      
      // 2. Clear Auth Session
      await supabase.auth.signOut();
      
      // 3. Clear local state regardless of auth success
      setUser(null);
      localStorage.removeItem(CACHE_KEY);
      setCurrentScreen('WELCOME');
      setSelectedChatUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      // Forced fallback for UI
      setUser(null);
      localStorage.removeItem(CACHE_KEY);
      setCurrentScreen('WELCOME');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'}`}>
        <div className="w-10 h-10 border-4 border-[#00D1C1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-6 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse text-[#00D1C1]">ATC Loading...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (!user) {
      if (currentScreen === 'REGISTER') return <RegisterScreen onSuccess={() => setCurrentScreen('HOME')} onNavigate={setCurrentScreen} />;
      if (currentScreen === 'LOGIN') return <LoginScreen onSuccess={() => setCurrentScreen('HOME')} onNavigate={setCurrentScreen} />;
      return <WelcomeScreen onSuccess={() => setCurrentScreen('HOME')} onNavigate={setCurrentScreen} />;
    }

    switch (currentScreen) {
      case 'CHAT':
        return selectedChatUser ? <ChatScreen currentUser={user} chatUser={selectedChatUser} onBack={() => setCurrentScreen('HOME')} /> : null;
      case 'PEOPLE':
        return <PeopleScreen currentUser={user} onSelectUser={(u) => { setSelectedChatUser(u); setCurrentScreen('CHAT'); }} />;
      case 'PROFILE':
        return <ProfileScreen user={user} onBack={() => setCurrentScreen('HOME')} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />;
      case 'HOME':
      default:
        return <HomeScreen currentUser={user} onSelectUser={(u) => { setSelectedChatUser(u); setCurrentScreen('CHAT'); }} onEditProfile={() => setCurrentScreen('PROFILE')} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {renderContent()}
      </div>
      {user && ['HOME', 'PEOPLE', 'PROFILE'].includes(currentScreen) && (
        <BottomNav activeTab={currentScreen as any} onTabChange={(tab) => setCurrentScreen(tab as AppScreen)} />
      )}
    </div>
  );
};

export default App;
