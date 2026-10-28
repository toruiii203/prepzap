import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { playPop } from '@/lib/soundFX';

interface MobileBottomNavProps {
  hide?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ hide = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (hide) return null;

  const tabs = [
    { name: 'Study Vault', path: '/campus-vault', icon: 'menu_book' },
    { name: 'Arena', path: '/arena', icon: 'sports_esports' },
    { name: 'Home', path: '/dashboard', icon: 'home' },
    { name: 'Library', path: '/sources', icon: 'folder' },
    { name: 'Friends', path: '/friends', icon: 'groups' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFDF5] border-t-2 border-[#000000] flex justify-around items-center px-1 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 4px)', paddingTop: '6px' }}
      aria-label="Mobile Navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === '/dashboard'
          ? location.pathname === '/dashboard' || location.pathname === '/'
          : tab.path === '/friends'
            ? location.pathname.startsWith('/friends') || location.pathname.startsWith('/community')
            : tab.path === '/campus-vault'
              ? location.pathname.startsWith('/campus-vault') || location.pathname.startsWith('/vault')
              : location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.name}
            type="button"
            data-route={tab.path}
            aria-label={tab.name}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              playPop();
              navigate(tab.path);
            }}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-0.5 transition-transform motion-safe:active:scale-95 motion-reduce:transition-none cursor-pointer ${
              isActive
                ? 'text-black'
                : 'text-black/60 hover:text-black'
            }`}
          >
            <div className={`flex flex-col items-center justify-center w-full h-11 rounded-xl relative ${
              isActive
                ? 'bg-[#FFD13B] border-2 border-black shadow-[0_2px_0_#000000]'
                : 'border-2 border-transparent'
            }`}>
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? 'text-black font-black' : ''}`}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold tracking-tight leading-none mt-0.5 whitespace-nowrap">
                {tab.name}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
