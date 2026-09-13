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
    { name: 'Tutor', path: '/ai-tutor', icon: 'smart_toy' },
    { name: 'Cards', path: '/flashcards', icon: 'style' },
    { name: 'Home', path: '/dashboard', icon: 'home' },
    { name: 'Planner', path: '/planner', icon: 'calendar_month' },
    { name: 'Arena', path: '/arena', icon: 'sports_esports' },
    { name: 'Notes', path: '/notes', icon: 'edit_document' },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2] border-t-2 border-[#1A1A1A] flex justify-around items-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === '/dashboard'
          ? location.pathname === '/dashboard' || location.pathname === '/'
          : location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.name}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 pt-3 pb-2 transition-colors ${
              isActive ? 'text-[#ae2925]' : 'text-[#1A1A1A] opacity-70 hover:opacity-100'
            }`}
          >
            <span className="material-symbols-outlined text-[22px] mb-1">
              {tab.icon}
            </span>
            <span className="text-[10px] font-bold font-quicksand">
              {tab.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
