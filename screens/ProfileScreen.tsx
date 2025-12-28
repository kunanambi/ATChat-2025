
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { Avatar, Button, Input, Logo } from '../components/UI';

interface ProfileProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const CACHE_KEY = 'atchat_profile_cache';

export const ProfileScreen: React.FC<ProfileProps> = ({ user, onBack, onLogout, isDarkMode, onToggleDarkMode }) => {
  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username, avatar_url: avatarUrl })
      .eq('id', user.id);
    
    if (!error) {
      setIsEditing(false);
      const updatedUser = { ...user, username, avatar_url: avatarUrl };
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedUser));
    }
    setLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      const updatedUser = { ...user, avatar_url: publicUrl };
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedUser));

    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      alert('Imeshindwa kupakia picha.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password lazima iwe na herufi angalau 6');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Password hazifanani!');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Password imesasishwa kikamilifu!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setIsChangingPassword(false), 2000);
      }
    } catch (err) {
      setPasswordError('Kuna tatizo limetokea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors pb-10">
      <header className="px-6 pt-14 pb-6 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 transition-colors border-b border-slate-100 dark:border-slate-900 animate-fade-in">
        <div className="flex items-center">
          <div className="flex-shrink-0 -ml-12 -mr-8">
            <Logo size="sm" showText={true} className="w-32 h-20" />
          </div>
          <div className="ml-2 border-l-2 border-slate-200 dark:border-slate-800 pl-4">
            <h1 className="text-2xl font-black text-[#1B273F] dark:text-slate-100 tracking-tight leading-none">Settings</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Preferences</p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-[#1B273F] dark:text-slate-100 shadow-sm active:scale-90 transition-all border border-slate-100 dark:border-slate-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
        </button>
      </header>

      <div className="flex flex-col items-center px-6 py-8 gap-6 overflow-y-auto">
        <div className="relative group animate-scale-up">
          <Avatar name={user.username} imageUrl={avatarUrl} size="xl" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-[#00D1C1] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-[#00BBAF]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors animate-slide-up stagger-1 opacity-0">
          {isEditing ? (
            <div className="space-y-4 animate-fade-in">
              <Input label="Display Name" value={username} onChange={setUsername} />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleUpdate} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          ) : (
            <div className="text-center animate-fade-in">
              <h2 className="text-2xl font-black text-[#1B273F] dark:text-slate-100 leading-tight">{user.username}</h2>
              <p className="text-slate-400 dark:text-slate-500 font-medium text-sm mt-1">{user.email}</p>
              <Button variant="secondary" className="w-full mt-6" onClick={() => {
                setIsEditing(true);
                setIsChangingPassword(false);
              }}>Edit Profile</Button>
            </div>
          )}
        </div>

        {/* Section: App Preferences */}
        <div className="w-full space-y-3">
          <p className="text-[10px] font-black text-[#1B273F] dark:text-slate-500 uppercase tracking-widest ml-4">Preferences</p>
          <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors animate-slide-up stagger-2 opacity-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/10 rounded-2xl flex items-center justify-center text-[#00D1C1]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-[#1B273F] dark:text-slate-100">Dark Mode</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Switch between themes</p>
                  </div>
                </div>
                <button 
                  onClick={onToggleDarkMode}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 flex items-center active:scale-95 ${isDarkMode ? 'bg-[#00D1C1]' : 'bg-slate-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
             </div>
          </div>
        </div>

        {/* Section: Security */}
        <div className="w-full space-y-3">
          <p className="text-[10px] font-black text-[#1B273F] dark:text-slate-500 uppercase tracking-widest ml-4">Account</p>
          <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden animate-slide-up stagger-3 opacity-0">
            <button onClick={() => { setIsChangingPassword(!isChangingPassword); setIsEditing(false); }} className="w-full flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-800 p-1 rounded-xl transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/10 rounded-2xl flex items-center justify-center text-[#F89D1B]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#1B273F] dark:text-slate-100">Security</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Update password</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${isChangingPassword ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {isChangingPassword && (
              <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4 animate-slide-up">
                <Input label="New Password" type="password" placeholder="Min 6 characters" value={newPassword} onChange={setNewPassword} />
                <Input label="Confirm Password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={setConfirmPassword} />
                {passwordError && <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 animate-fade-in"><p className="text-xs text-red-600 dark:text-red-400 font-bold text-center">{passwordError}</p></div>}
                {passwordSuccess && <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20 animate-fade-in"><p className="text-xs text-green-600 dark:text-green-400 font-bold text-center">{passwordSuccess}</p></div>}
                <Button type="submit" className="w-full" disabled={loading || !newPassword}>{loading ? 'Updating...' : 'Save Changes'}</Button>
              </form>
            )}
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full py-4 bg-red-600 text-white rounded-3xl font-black text-lg shadow-lg shadow-red-100 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest mt-6 animate-slide-up stagger-4 opacity-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Logout
        </button>
      </div>
    </div>
  );
};
