import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { playPop } from '@/lib/soundFX';
import { getDueCount } from '@/lib/spacedRepetition';

interface MobileBottomNavProps {
  hide?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ hide = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    try {
      setDueCount(getDueCount());
    } catch {}
  }, []);

  if (hide) return null;

  const tabs = [
    { name: 'Home', path: '/dashboard', icon: 'home' },
    { name: 'Practice', path: '/practice', icon: 'bolt' },
    { name: 'Arena', path: '/arena', icon: 'sports_esports' },
    { name: 'Library', path: '/sources', icon: 'folder' },
    { name: 'Friends', path: '/friends', icon: 'groups' },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFDF5] border-t-2 border-[#1A1A1A] flex justify-around items-center px-1 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 4px)', paddingTop: '6px' }}
      aria-label="Mobile Navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === '/dashboard'
          ? location.pathname === '/dashboard' || location.pathname === '/'
          : tab.path === '/friends'
            ? location.pathname.startsWith('/friends') || location.pathname.startsWith('/community')
            : location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.name}
            type="button"
            aria-label={tab.name}
            onClick={() => {
              playPop();
              navigate(tab.path);
            }}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1 transition-all active:scale-90 cursor-pointer ${
              isActive 
                ? 'text-black' 
                : 'text-black/60 hover:text-black'
            }`}
          >
            <div className={`flex flex-col items-center justify-center rounded-xl transition-all relative ${
              isActive 
                ? 'bg-[#FFD13B] px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_#1A1A1A] -translate-y-0.5' 
                : 'py-0.5'
            }`}>
              {tab.path === '/practice' && dueCount > 0 && (
                <span className="absolute -top-1 -right-1 border border-black bg-[#FF4D2E] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full leading-tight">
                  {dueCount}
                </span>
              )}
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? 'text-black font-black' : ''}`}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-black tracking-tight leading-none mt-0.5">
                {tab.name}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
