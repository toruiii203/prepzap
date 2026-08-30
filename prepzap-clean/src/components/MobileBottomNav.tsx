import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileBottomNavProps {
  hide?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ hide = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (hide) return null;

  const tabs = [
    { name: 'Home', path: '/dashboard', icon: 'home' },
    { name: 'Practice', path: '/practice', icon: 'assignment' },
    { name: 'Tutor', path: '/ai-tutor', icon: 'smart_toy' },
    { name: 'Cards', path: '/flashcards', icon: 'style' },
    { name: 'Arena', path: '/arena', icon: 'sports_esports' },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2] border-t-2 border-[#1A1A1A] flex justify-around items-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path) || (location.pathname === '/' && tab.path === '/dashboard');
        return (
          <button
            key={tab.name}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center w-16 pt-3 pb-2 transition-colors ${
              isActive ? 'text-[#ae2925]' : 'text-[#1A1A1A] opacity-70'
            }`}
          >
            <span className="material-symbols-outlined text-2xl mb-1">
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold font-quicksand">
              {tab.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
