import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <Command
          className="w-full flex flex-col"
          loop
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        >
          <div className="flex items-center border-b-4 border-black px-4">
            <span className="material-symbols-outlined text-[24px] text-black/40 mr-2">search</span>
            <Command.Input 
              autoFocus
              placeholder="Jump to..." 
              className="flex-1 py-4 text-[16px] font-bold outline-none placeholder:text-black/30"
            />
            <button onClick={() => setOpen(false)} className="text-[12px] font-black uppercase text-black/50 hover:text-black border-2 border-black px-2 py-1 bg-[#FAF7F2]">ESC</button>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 outline-none">
            <Command.Empty className="py-6 text-center text-[14px] font-bold text-black/50">No results found.</Command.Empty>
            
            <Command.Group heading="Tools" className="px-2 py-2 text-[11px] font-black uppercase text-black/40 tracking-wider">
              {[
                { name: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
                { name: 'AI Tutor', icon: 'psychology', route: '/ai-tutor' },
                { name: 'Flashcards', icon: 'bolt', route: '/flashcards' },
                { name: 'Practice Exams', icon: 'quiz', route: '/practice' },
                { name: 'Math Solver', icon: 'calculate', route: '/math' },
                { name: 'Focus Timer', icon: 'timer', route: '/timer' },
                { name: 'Source Library', icon: 'auto_stories', route: '/sources' },
                { name: 'Study Planner', icon: 'calendar_month', route: '/planner' },
              ].map(t => (
                <Command.Item
                  key={t.route}
                  onSelect={() => { navigate(t.route); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer aria-selected:bg-[#E8534A] aria-selected:text-white rounded-none border-2 border-transparent aria-selected:border-black font-bold text-[14px] my-1"
                >
                  <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                  {t.name}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Account" className="px-2 py-2 text-[11px] font-black uppercase text-black/40 tracking-wider mt-2 border-t-2 border-black/10">
              <Command.Item onSelect={() => { navigate('/profile'); setOpen(false); }} className="flex items-center gap-3 px-3 py-3 cursor-pointer aria-selected:bg-black aria-selected:text-white rounded-none border-2 border-transparent aria-selected:border-black font-bold text-[14px] my-1">
                <span className="material-symbols-outlined text-[20px]">person</span> Profile
              </Command.Item>
              <Command.Item onSelect={() => { navigate('/settings'); setOpen(false); }} className="flex items-center gap-3 px-3 py-3 cursor-pointer aria-selected:bg-black aria-selected:text-white rounded-none border-2 border-transparent aria-selected:border-black font-bold text-[14px] my-1">
                <span className="material-symbols-outlined text-[20px]">settings</span> Settings
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
