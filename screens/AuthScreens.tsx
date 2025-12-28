
import React, { useState } from 'react';
import { Button, Input, Logo } from '../components/UI';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onSuccess: () => void;
  onNavigate: (screen: 'WELCOME' | 'LOGIN' | 'REGISTER') => void;
}

export const WelcomeScreen: React.FC<AuthProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col px-8 py-12 bg-white dark:bg-slate-950 transition-colors animate-fade-in">
      <div className="mt-16 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="mt-auto text-center animate-slide-up stagger-2">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Welcome</h1>
        <p className="text-slate-400 text-sm mb-12 max-w-[240px] mx-auto leading-relaxed font-medium">
          Create an account and access our awesome services
        </p>
        <button 
          onClick={() => onNavigate('LOGIN')}
          className="w-full py-4 bg-[#00D1C1] text-white rounded-full font-bold text-lg shadow-lg shadow-teal-100 dark:shadow-none active:scale-95 transition-all mb-6"
        >
          Getting Started
        </button>
        <p className="text-slate-400 text-xs">
          Already have an account? <button onClick={() => onNavigate('LOGIN')} className="text-[#00D1C1] font-bold">Log in</button>
        </p>
      </div>
    </div>
  );
};

export const LoginScreen: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Please enter both email and password');
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-8 py-12 bg-white dark:bg-slate-950 transition-colors animate-fade-in">
      <div className="mt-4 flex justify-center">
        <Logo />
      </div>
      <div className="text-center mb-10 animate-slide-up">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ATChat</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Log In Now</p>
        <p className="text-slate-400 text-xs mt-1">Please login to continue using our app</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-slide-up stagger-1">
        <div className="relative">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-[#00D1C1] transition-all text-sm font-medium"
          />
        </div>
        <div className="relative">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-[#00D1C1] transition-all text-sm font-medium"
          />
          <button type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
        </div>
        {error && <p className="text-xs text-red-500 font-bold text-center mt-1">{error}</p>}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-[#00D1C1] text-white rounded-full font-bold text-lg shadow-xl shadow-teal-100 dark:shadow-none active:scale-95 transition-all mt-6"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="mt-auto text-center animate-slide-up stagger-3">
        <p className="text-slate-400 text-xs font-medium">
          Don't have an account? <button onClick={() => onNavigate('REGISTER')} className="text-[#00D1C1] font-black">Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export const RegisterScreen: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return setError('Please fill in all fields');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabase.from('profiles').insert({ id: data.user.id, username: username.trim(), email: email.trim(), is_online: true });
        onSuccess();
      }
    } catch (err) {
      setError("An error occurred during registration.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-8 py-12 bg-white dark:bg-slate-950 transition-colors animate-fade-in">
      <div className="mt-4 flex justify-center">
        <Logo />
      </div>
      <div className="text-center mb-10 animate-slide-up">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ATChat</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Sign Up Now</p>
        <p className="text-slate-400 text-xs mt-1">Please fill the details and create account</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-slide-up stagger-1">
        <input 
          placeholder="Full name" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-[#00D1C1] transition-all text-sm font-medium"
        />
        <input 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-[#00D1C1] transition-all text-sm font-medium"
        />
        <div className="relative">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-[#00D1C1] transition-all text-sm font-medium"
          />
          <button type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
        </div>
        {error && <p className="text-xs text-red-500 font-bold text-center mt-1">{error}</p>}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-[#00D1C1] text-white rounded-full font-bold text-lg shadow-xl shadow-teal-100 dark:shadow-none active:scale-95 transition-all mt-6"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-auto text-center animate-slide-up stagger-3">
        <p className="text-slate-400 text-xs font-medium">
          Already have an account? <button onClick={() => onNavigate('LOGIN')} className="text-[#00D1C1] font-black">Log in</button>
        </p>
      </div>
    </div>
  );
};
