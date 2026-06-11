import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface StudyPlannerProps {
}

interface PlannerSession {
  id: string | number;
  subject: string;
  time: string;
  topic?: string;
  color?: string;
  completed: boolean;
}

export default function StudyPlanner(()) {
  const [sessions, setSessions] = useState<PlannerSession[]>([]);
  const [activeMonth] = useState("June 2026");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubj, setNewSubj] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [selectedDayNum, setSelectedDayNum] = useState<number>(25);

  const STORAGE_KEY_PLANNER = "studenius_planner_slots";

  // Load slots on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY_PLANNER);
    if (raw) {
      try {
        setSessions(JSON.parse(raw));
      } catch {
        setSessions(getDefaultSessions());
      }
    } else {
      const def = getDefaultSessions();
      setSessions(def);
      localStorage.setItem(STORAGE_KEY_PLANNER, JSON.stringify(def));
    }
  }, []);

  const savePlannerRows = (updated: PlannerSession[]) => {
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY_PLANNER, JSON.stringify(updated));
  };

  const getDefaultSessions = (): PlannerSession[] => {
    return [
      {
        id: "s1",
        subject: "Calculus III",
        time: "10:00 AM - 11:30 AM",
        topic: "Chapter 4 Review",
        color: "bg-blue-500",
        completed: false
      },
      {
        id: "s2",
        subject: "World History",
        time: "02:00 PM - 03:30 PM",
        topic: "Essay Draft Check",
        color: "bg-green-500",
        completed: false
      },
      {
        id: "s3",
        subject: "Chemistry Lab",
        time: "08:00 AM - 09:00 AM",
        topic: "Qualitative Assay",
        color: "bg-emerald-700",
        completed: true
      }
    ];
  };

  const handleToggleCompleted = (id: string | number) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    savePlannerRows(updated);
  };

  const handleAddSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubj || !newTime) return;

    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-600", "bg-rose-500", "bg-yellow-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newS: PlannerSession = {
      id: "slot_" + Date.now(),
      subject: newSubj,
      time: newTime,
      topic: newTopic || "General study session",
      color: randomColor,
      completed: false
    };

    const updated = [...sessions, newS];
    savePlannerRows(updated);

    setNewSubj("");
    setNewTime("");
    setNewTopic("");
    setShowAddForm(false);
  };

  const handleDeleteSession = (id: string | number) => {
    const updated = sessions.filter(s => s.id !== id);
    savePlannerRows(updated);
  };

  return (
    <div className="bg-[#fcf9f4] text-[#1c1c19] min-h-screen flex flex-col items-center justify-start pb-28 font-body-md w-full max-w-[390px] mx-auto border-x border-black/10 shadow-xl relative overflow-y-auto flex-1">
      
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-[#FAF7F2] z-50 flex items-center justify-between px-5 h-16 border-b-2 border-on-background shadow-xs navbar-custom">
        <button 
          onClick={() => navigate("/dashboard")}
          className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center cursor-pointer border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold">Studenius Planner</span>
        <button 
          onClick={() => alert(`//// Planner active: ${activeMonth}. Pro session syncing is enabled.`)}
          className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center"
        >
          <span className="material-symbols-outlined">calendar_month</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-5 py-6 flex flex-col gap-6">
        
        {/* Calendar Navigation header */}
        <section className="w-full flex flex-col gap-4">
          <div className="flex justify-between items-center w-full">
            <h2 className="font-headline text-headline-lg font-extrabold text-[21px] text-on-background">
              {activeMonth}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => {}}
                className="border-2 border-[#1c1c19] rounded-full w-8 h-8 flex items-center justify-center bg-white shadow-[1.5px_1.5px_0px_#1C1C19] active:translate-y-0.5 active:shadow-none"
              >
                <span className="material-symbols-outlined text-sm font-semibold">chevron_left</span>
              </button>
              <button 
                onClick={() => {}}
                className="border-2 border-[#1c1c19] rounded-full w-8 h-8 flex items-center justify-center bg-white shadow-[1.5px_1.5px_0px_#1C1C19] active:translate-y-0.5 active:shadow-none"
              >
                <span className="material-symbols-outlined text-sm font-semibold">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Calendar Grid Representation */}
          <div className="w-full bg-white border-2 border-black rounded-2xl p-5 shadow-[3.5px_3.5px_rgba(0,0,0,1)] flex flex-col gap-2.5">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-label-sm text-[12px] text-[#E8534A] mb-2 font-bold opacity-60">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            
            {/* Dates grid */}
            <div className="grid grid-cols-7 gap-y-3.5 gap-x-1.5 text-center font-body-md text-[14.5px] font-bold">
              {/* Previous month greyed out indicators (simplified) */}
              <div className="text-neutral-300 select-none pb-1">1</div>
              <div className="text-neutral-300 select-none pb-1">2</div>
              <div className="text-neutral-300 select-none pb-1">3</div>
              <div className="text-neutral-300 select-none pb-1">4</div>
              
              {/* Active days list */}
              {Array.from({ length: 27 }, (_, i) => i + 5).map((day) => {
                const isSelected = selectedDayNum === day;
                return (
                  <div 
                    key={day}
                    onClick={() => setSelectedDayNum(day)}
                    className="flex flex-col items-center justify-center cursor-pointer relative"
                  >
                    {isSelected ? (
                      <span className="w-8 h-8 rounded-full bg-[#E8534A] text-white flex items-center justify-center font-bold shadow-[1.5px_1.5px_rgba(0,0,0,1)] border border-black">
                        {day}
                      </span>
                    ) : (
                      <span className="hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center">
                        {day}
                      </span>
                    )}
                    {day === 7 && <div className="w-1.5 h-1.5 rounded-full bg-teal-500 absolute bottom-[-4px]"></div>}
                    {day === 12 && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 absolute bottom-[-4px]"></div>}
                    {day === 25 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute bottom-[-4px]"></div>}
                  </div>
                );
              })}
              
              {/* Next month greyed out indicators */}
              <div className="text-neutral-300 select-none pb-1">1</div>
              <div className="text-neutral-300 select-none pb-1">2</div>
              <div className="text-neutral-300 select-none pb-1">3</div>
              <div className="text-neutral-300 select-none pb-1">4</div>
            </div>
          </div>
        </section>

        {/* Sessions list */}
        <section className="w-full flex flex-col gap-4 pb-16">
          <h3 className="font-headline text-headline-md font-extrabold text-[#1c1c19] text-[17.5px]">
            Sessions for June {selectedDayNum}
          </h3>

          <div className="flex flex-col gap-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-[#1a1a1a]/20 rounded-2xl bg-white">
                <p className="text-sm font-bold opacity-60">No study blocks booked for today</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-xs bg-primary text-white border-2 border-black rounded-full px-3 py-1 font-bold"
                >
                  Create Study Slot
                </button>
              </div>
            ) : (
              sessions.map((s) => {
                const borderCol = s.color || "bg-blue-500";
                return (
                  <div 
                    key={s.id}
                    className={`w-full bg-white border-2 border-black rounded-2xl p-5 flex items-center justify-between relative overflow-hidden shadow-[2px_2px_rgba(0,0,0,1)] transition-opacity duration-200 ${
                      s.completed ? "opacity-70 bg-[#f6f3ee]" : ""
                    }`}
                  >
                    {/* Left color ribbon */}
                    <div className={`absolute left-0 top-0 bottom-0 w-3 border-r-2 border-black ${borderCol}`}></div>
                    
                    <div className={`pl-4 flex-1 pr-3 flex flex-col gap-1.5 text-left ${s.completed ? "line-through opacity-50" : ""}`}>
                      <span className="font-label-sm text-label-sm text-secondary uppercase font-bold text-[11px] opacity-75">
                        {s.time}
                      </span>
                      <h4 className="font-headline text-headline-md text-on-background font-extrabold text-[16px] leading-tight break-words">
                        {s.subject}
                      </h4>
                      {s.topic && (
                        <span className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1.5 text-[13px] font-semibold">
                          <span className="material-symbols-outlined text-[13px]">book</span>
                          {s.topic}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Delete slot */}
                      <button 
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1 hover:text-[#E8534A] rounded-full transition-colors cursor-pointer"
                        title="Delete slot"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>

                      {/* Checkbox action */}
                      <input 
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => handleToggleCompleted(s.id)}
                        className="w-5.5 h-5.5 border-2 border-black rounded cursor-pointer accent-[#ae2925] shrink-0"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Dynamic add task popup */}
        {showAddForm && (
          <form 
            onSubmit={handleAddSessionSubmit}
            className="w-full bg-white border-2 border-black rounded-2xl p-5 flex flex-col gap-4 shadow-[4px_4px_rgba(0,0,0,1)] relative z-50 text-left"
          >
            <h4 className="font-headline text-[13.5px] uppercase tracking-wider text-[#E8534A] font-extrabold">
              Add New Study Slot
            </h4>
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Subject Name (e.g. Calculus III)" 
                value={newSubj}
                onChange={(e) => setNewSubj(e.target.value)}
                className="border-2 border-black rounded-lg p-3 text-xs font-bold w-full"
                required
              />
              <input 
                type="text" 
                placeholder="Time Bounds (e.g. 10:00 AM - 11:30 AM)" 
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="border-2 border-black rounded-lg p-3 text-xs font-bold w-full"
                required
              />
              <input 
                type="text" 
                placeholder="Session Topic / Target task" 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="border-2 border-black rounded-lg p-3 text-xs font-bold w-full"
              />
            </div>
            <div className="flex justify-between mt-2">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-xs font-bold text-slate-500 underline p-2 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-primary text-white hover:bg-neutral-800 text-xs font-extrabold px-5 py-3 border border-black rounded-lg shadow-sm cursor-pointer"
              >
                Save Slot
              </button>
            </div>
          </form>
        )}

      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          setShowAddForm(true);
        }}
        className="absolute bottom-28 right-5 w-14 h-14 bg-[#E8534A] text-white border-2 border-black rounded-full flex items-center justify-center shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 select-none hover:bg-opacity-95 z-45 cursor-pointer"
      >
        <span className="material-symbols-outlined text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>

    </div>
  );
}
