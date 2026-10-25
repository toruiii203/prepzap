import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { playPop, playTap, setSoundEnabled, isSoundEnabled } from '@/lib/soundFX';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_#000] w-full max-w-lg overflow-hidden flex flex-col font-['Quicksand',sans-serif]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="w-full flex flex-col"
          loop
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        >
          <div className="flex items-center border-b-2 border-black px-4 bg-[#FFFDF5]">
            <span className="material-symbols-outlined text-[22px] text-black/50 mr-2.5">search</span>
            <Command.Input
              autoFocus
              placeholder="Search destinations, study actions, tools..."
              className="flex-1 py-4 text-[15px] font-bold outline-none placeholder:text-black/40 bg-transparent text-black"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-black/40 border border-black/20 px-1.5 py-0.5 rounded bg-black/5">
                Ctrl+K
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-black uppercase text-black/60 hover:text-black border-2 border-black px-2 py-0.5 bg-white rounded cursor-pointer"
              >
                ESC
              </button>
            </div>
          </div>

          <Command.List className="max-h-[340px] overflow-y-auto p-2.5 outline-none space-y-2">
            <Command.Empty className="py-8 text-center text-[13px] font-bold text-black/50">
              No matching actions or destinations found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Study Actions" className="px-2 py-1 text-[11px] font-black uppercase text-black/40 tracking-wider">
              <Command.Item
                onSelect={() => {
                  playPop();
                  navigate('/practice?autostart=true&subject=math');
                  setOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer aria-selected:bg-[#FFD13B] aria-selected:text-black rounded-xl border-2 border-transparent aria-selected:border-black font-extrabold text-[13.5px] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[19px] text-[#FF4D2E]">bolt</span>
                  <span>Start 1-Tap Lesson</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/5 border border-black/10">Instant</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  playPop();
                  navigate('/flashcards?view=study');
                  setOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer aria-selected:bg-[#FFD13B] aria-selected:text-black rounded-xl border-2 border-transparent aria-selected:border-black font-extrabold text-[13.5px] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[19px] text-[#10B981]">style</span>
                  <span>Review Due Flashcards</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/5 border border-black/10">SRS</span>
              </Command.Item>
            </Command.Group>

            {/* Core Destinations */}
            <Command.Group heading="Destinations" className="px-2 py-1 text-[11px] font-black uppercase text-black/40 tracking-wider border-t border-black/10 pt-2">
              {[
                { name: 'Learn Dashboard', icon: 'dashboard', route: '/dashboard' },
                { name: 'Active Practice', icon: 'bolt', route: '/practice' },
                { name: 'Arena Battle', icon: 'sports_esports', route: '/arena' },
                { name: 'Source Library', icon: 'folder_open', route: '/sources' },
                { name: 'Study Buddies & Friends', icon: 'groups', route: '/friends' },
                { name: 'Rex AI Tutor', icon: 'forum', route: '/ai-tutor' },
                { name: 'Study Planner', icon: 'calendar_month', route: '/planner' },
                { name: 'Math Solver', icon: 'calculate', route: '/math' },
                { name: 'Mistake Journal', icon: 'auto_stories', route: '/mistakes' },
              ].map((item) => (
                <Command.Item
                  key={item.route}
                  onSelect={() => {
                    playTap();
                    navigate(item.route);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer aria-selected:bg-black aria-selected:text-white rounded-xl border-2 border-transparent aria-selected:border-black font-bold text-[13px] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
