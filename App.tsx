
import React, { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !profile) {
        const newProfile = {
          id: userId,
          email: email,
          username: email.split('@')[0],
          is_online: true,
          last_seen: new Date().toISOString()
        };
        
        const { data: upsertedData } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .single();
        
        if (upsertedData) {
          setUser(upsertedData);
          localStorage.setItem(CACHE_KEY, JSON.stringify(upsertedData));
          return upsertedData;
        }
        return newProfile;
      }

      if (profile) {
        setUser(profile);
        localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
        // Silently update online status
        supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', userId);
      }
      return profile;
    } catch (err) {
      console.error("Profile fetch error:", err);
      return null;
    }
  }, []);

  const initSession = useCallback(async () => {
    // Safety timeout: if session check takes more than 3 seconds, force stop loading
    const timer = setTimeout(() => setLoading(false), 3000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        localStorage.removeItem(CACHE_KEY);
      }
    } catch (e) {
      console.error("Session init error:", e);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        await fetchProfile(session.user.id, session.user.email || '');
        setCurrentScreen('HOME');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem(CACHE_KEY);
        setCurrentScreen('WELCOME');
        setSelectedChatUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, initSession]);

  const handleLogout = async () => {
    const oldUserId = user?.id;
    setLoading(true);
    try {
      if (oldUserId) {
        await supabase.from('profiles').update({ is_online: false }).eq('id', oldUserId);
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setUser(null);
      localStorage.removeItem(CACHE_KEY);
      setCurrentScreen('WELCOME');
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-gray-900'}`}>
        <div className="w-12 h-12 border-4 border-[#00D1C1] border-t-transparent rounded-full animate-spin shadow-lg shadow-teal-500/20" />
        <p className={`mt-6 font-black text-xs uppercase tracking-[0.3em] animate-pulse ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Session Syncing</p>
      </div>
    );
  }

  const renderContent = () => {
    const screenKey = `${currentScreen}-${selectedChatUser?.id || 'main'}`;
    
    const content = (() => {
      if (!user) {
        if (currentScreen === 'REGISTER') return <RegisterScreen onSuccess={() => setCurrentScreen('HOME')} onNavigate={setCurrentScreen} />;
        if (currentScreen === 'LOGIN') return <LoginScreen onSuccess={() => setCurrentScreen('HOME')} onNavigate={setCurrentScreen} />;
        return <WelcomeScreen onSuccess={() => setCurrentScreen('HOME')} onNavigate={setCurrentScreen} />;
      }

      switch (currentScreen) {
        case 'CHAT':
          return selectedChatUser ? (
            <ChatScreen currentUser={user} chatUser={selectedChatUser} onBack={() => setCurrentScreen('HOME')} />
          ) : null;
        case 'PEOPLE':
          return <PeopleScreen currentUser={user} onSelectUser={(u) => { setSelectedChatUser(u); setCurrentScreen('CHAT'); }} />;
        case 'PROFILE':
          return <ProfileScreen user={user} onBack={() => setCurrentScreen('HOME')} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />;
        case 'HOME':
        default:
          return <HomeScreen currentUser={user} onSelectUser={(u) => { setSelectedChatUser(u); setCurrentScreen('CHAT'); }} onEditProfile={() => setCurrentScreen('PROFILE')} />;
      }
    })();

    return <div key={screenKey} className="animate-fade-in h-full">{content}</div>;
  };

  const showNav = user && ['HOME', 'PEOPLE', 'PROFILE'].includes(currentScreen);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 selection:bg-teal-100 dark:selection:bg-teal-900/30 transition-colors duration-300 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {renderContent()}
      </div>
      {showNav && (
        <BottomNav activeTab={currentScreen as any} onTabChange={(tab) => setCurrentScreen(tab as AppScreen)} />
      )}
    </div>
  );
};

export default App;
