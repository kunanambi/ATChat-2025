
import React from 'react';

export const Logo: React.FC<{ size?: 'xs' | 'sm' | 'md' | 'lg', showText?: boolean, className?: string }> = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    xs: 0.3,
    sm: 0.6,
    md: 1,
    lg: 2
  };
  const scale = sizes[size];
  
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <div className="relative w-32 h-32 flex items-center justify-center animate-scale-up">
        <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Mortarboard Cap (Teal) */}
          <path d="M100 20L20 65L100 110L180 65L100 20Z" fill="#00D1C1" />
          <path d="M100 65L100 110L180 65L100 65Z" fill="#00BBAF" opacity="0.5" />
          <path d="M50 82V120C50 120 70 135 100 135C130 135 150 120 150 120V82" fill="#00D1C1" />
          {/* Tassel */}
          <rect x="35" y="65" width="4" height="40" fill="#00D1C1" />
          <circle cx="37" cy="115" r="10" fill="#00D1C1" />
          
          {/* Chat Bubble (Dark Blue with Orange Shadow/Border) */}
          <circle cx="110" cy="120" r="60" fill="#F89D1B" />
          <circle cx="106" cy="116" r="60" fill="#1B273F" />
          <path d="M60 160L55 185L85 170" fill="#1B273F" />
          
          {/* Signal Waves (Orange) */}
          <path d="M145 75C160 75 175 85 180 100" stroke="#F89D1B" strokeWidth="8" strokeLinecap="round" />
          <path d="M145 95C152 95 160 100 162 108" stroke="#F89D1B" strokeWidth="8" strokeLinecap="round" />

          {showText && (
            <>
              {/* Text ATC (White) */}
              <text x="65" y="130" fill="white" fontSize="42" fontWeight="900" style={{ fontFamily: 'Inter, sans-serif' }}>ATC</text>
              {/* Text Chat (Orange) */}
              <text x="90" y="165" fill="#F89D1B" fontSize="24" fontWeight="500" style={{ fontFamily: 'Inter, sans-serif' }}>Chat</text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, type = 'button', variant = 'primary', className = '', disabled }) => {
  const base = "px-4 py-3 rounded-2xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 overflow-hidden relative";
  const variants = {
    primary: "bg-[#00D1C1] text-white hover:bg-[#00BBAF] shadow-md shadow-teal-100 dark:shadow-teal-900/20",
    secondary: "bg-[#1B273F] text-white hover:bg-[#253554] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
    ghost: "bg-transparent text-[#1B273F] hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<{
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}> = ({ label, type = 'text', placeholder, value, onChange, error }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-bold text-[#1B273F] dark:text-slate-300 ml-1 uppercase tracking-tight">{label}</label>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3.5 bg-gray-50 border-2 ${error ? 'border-red-500' : 'border-gray-100 focus:border-[#00D1C1] dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-[#00D1C1]/50'} rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all text-gray-900 dark:text-slate-100 font-semibold text-[15px]`}
    />
    {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}
  </div>
);

export const Header: React.FC<{
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}> = ({ title, subtitle, leftAction, rightAction }) => (
  <header className="px-5 py-4 bg-white dark:bg-slate-950/80 dark:backdrop-blur-md border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-40 transition-colors animate-fade-in">
    <div className="flex items-center gap-3 overflow-hidden">
      {leftAction}
      <div className="flex flex-col overflow-hidden animate-slide-in-right">
        <h2 className="text-[17px] font-black text-[#1B273F] dark:text-slate-100 leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#F89D1B] dark:text-[#F89D1B] font-black uppercase tracking-tighter">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center">
      {rightAction}
    </div>
  </header>
);

export const Avatar: React.FC<{
  name: string;
  imageUrl?: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ name, imageUrl, isOnline, size = 'md', className = '' }) => {
  const sizes = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };
  
  const statusSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-4.5 h-4.5",
    xl: "w-6 h-6"
  };

  const seed = encodeURIComponent(name);
  const placeholderUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <div className={`relative inline-block transition-transform duration-500 hover:scale-110 active:scale-95 ${className}`}>
      <div className={`${sizes[size]} rounded-[30%] flex items-center justify-center p-[2px] bg-gradient-to-br from-[#00D1C1] via-[#F89D1B]/30 to-[#1B273F]/10 dark:from-[#00D1C1]/40 dark:to-slate-900 shadow-xl overflow-visible`}>
        <div className="w-full h-full rounded-[28%] bg-white dark:bg-slate-900 overflow-hidden relative flex items-center justify-center border-2 border-white dark:border-slate-950">
          <img 
            src={imageUrl || placeholderUrl} 
            alt={name} 
            className="w-full h-full object-cover animate-fade-in"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </div>
      </div>
      
      {/* Sasa inaonyesha kijani TU kama ni kweli yupo online */}
      {isOnline === true && (
        <div className={`absolute -bottom-1 -right-1 ${statusSizes[size]} rounded-full border-[3px] border-white dark:border-slate-950 flex items-center justify-center z-20`}>
          <span className="w-full h-full rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.7)] animate-pulse" />
        </div>
      )}
    </div>
  );
};

export const BottomNav: React.FC<{
  activeTab: 'HOME' | 'PEOPLE' | 'PROFILE';
  onTabChange: (tab: 'HOME' | 'PEOPLE' | 'PROFILE') => void;
}> = ({ activeTab, onTabChange }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors animate-slide-up">
    <button onClick={() => onTabChange('HOME')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'HOME' ? 'text-[#00D1C1] dark:text-[#00D1C1] scale-125' : 'text-slate-400 dark:text-slate-600 hover:text-teal-400'}`}>
      <svg className="w-6 h-6" fill={activeTab === 'HOME' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
      <span className="text-[10px] font-black uppercase tracking-widest">Chats</span>
    </button>
    <button onClick={() => onTabChange('PEOPLE')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'PEOPLE' ? 'text-[#00D1C1] dark:text-[#00D1C1] scale-125' : 'text-slate-400 dark:text-slate-600 hover:text-teal-400'}`}>
      <svg className="w-6 h-6" fill={activeTab === 'PEOPLE' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
      <span className="text-[10px] font-black uppercase tracking-widest">People</span>
    </button>
    <button onClick={() => onTabChange('PROFILE')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'PROFILE' ? 'text-[#00D1C1] dark:text-[#00D1C1] scale-125' : 'text-slate-400 dark:text-slate-600 hover:text-teal-400'}`}>
      <svg className="w-6 h-6" fill={activeTab === 'PROFILE' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
      <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
    </button>
  </nav>
);
