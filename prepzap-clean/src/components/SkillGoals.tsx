import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { calculateSkillProgress, StudyActivity, UserSkill } from "@/lib/skillsProgress";
import { loadLibrary } from "@/lib/sourceContext";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export function SkillGoals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<(UserSkill & { progress: number; activityCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Picker state
  const [showPicker, setShowPicker] = useState(false);
  const [library, setLibrary] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  // Banner state
  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem("pz_hide_skill_banner") !== "true";
  });

  const dismissBanner = () => {
    localStorage.setItem("pz_hide_skill_banner", "true");
    setShowBanner(false);
  };

  useEffect(() => {
    if (user) {
      loadSkills();
      setLibrary(loadLibrary());
    }
  }, [user]);

  const loadSkills = async () => {
    if (!user) return;
    try {
      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
        
      if (!skillsData) {
        setSkills([]);
        return;
      }
      
      const sourceIds = skillsData.map(s => s.source_id);
      
      const { data: activityData } = await supabase
        .from("study_activity")
        .select("*")
        .eq("user_id", user.id)
        .in("source_id", sourceIds);
        
      const activities = (activityData || []) as StudyActivity[];
      
      const merged = skillsData.map(skill => {
        const skillActs = activities.filter(a => a.source_id === skill.source_id);
        return {
          ...skill,
          progress: calculateSkillProgress(skillActs),
          activityCount: skillActs.length
        };
      });
      
      setSkills(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (sourceId: string, label: string) => {
    if (!user) return;
    setShowPicker(false);
    
    // Optimistic
    const tempId = "temp_" + Date.now();
    setSkills(prev => [...prev, {
      id: tempId,
      user_id: user.id,
      source_id: sourceId,
      label,
      created_at: new Date().toISOString(),
      progress: 0,
      activityCount: 0
    }]);

    await supabase.from("user_skills").insert({
      user_id: user.id,
      source_id: sourceId,
      label
    });
    
    loadSkills();
  };
  
  const filteredLibrary = library.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000] p-5 mt-6">
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest">Skill Goals</h3>
        <button 
          onClick={() => setShowPicker(true)}
          className="text-[11px] font-black uppercase bg-black text-white px-2 py-1 hover:bg-[#ae2925] transition-colors"
        >
          + Add Focus
        </button>
      </div>

      {showBanner && (
        <div className="bg-[#FEF9EE] border-2 border-[#E8A020] p-3 mb-4 flex justify-between items-start gap-2">
          <p className="text-[12px] font-bold text-[#92600A] leading-snug">
            Skill tracking starts today ?" progress builds as you keep studying.
          </p>
          <button onClick={dismissBanner} className="text-[#92600A] hover:text-black font-black text-[14px]">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center text-[12px] font-bold text-black/50">Loading skills...</div>
      ) : skills.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[12px] font-bold text-black/40 mb-3">No skill goals tracked yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {skills.map(skill => {
            const isMastered = skill.progress >= 90;
            return (
              <div key={skill.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    {isMastered && <span className="material-symbols-outlined text-[14px] text-[#f0a040]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>}
                    <span className="text-[13px] font-black">{skill.label}</span>
                  </div>
                  <span className="text-[12px] font-bold text-black/60">{skill.progress}%</span>
                </div>
                
                {skill.activityCount === 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-black/40">No activity yet.</span>
                    <button 
                      onClick={() => {
                        // Attempt to pre-filter Practice by passing it through local storage or just navigate
                        navigate("/practice");
                      }}
                      className="text-[10px] font-black uppercase tracking-widest border-2 border-black bg-[#FAF7F2] hover:bg-black hover:text-white px-2 py-1 transition-colors"
                    >
                      Log a session
                    </button>
                  </div>
                ) : (
                  <div className="h-2.5 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden relative">
                    <div 
                      className="h-full bg-[#ae2925] transition-all duration-700" 
                      style={{ width: `${skill.progress}%` }} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] w-full max-w-md p-5 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[16px]">Track a new Skill</h3>
              <button onClick={() => setShowPicker(false)} className="text-[20px] font-black">×</button>
            </div>
            
            <p className="text-[12px] font-bold text-black/60 mb-3">Select a source file/deck to track as a skill goal.</p>
            
            <div className="flex items-center gap-2 border-2 border-black px-3 py-2 mb-4 bg-[#FAF7F2]">
              <Search size={16} />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search library..." className="bg-transparent text-[13px] font-bold outline-none flex-1"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {filteredLibrary.length === 0 ? (
                <div className="text-center py-4 text-[12px] font-bold text-black/40">No sources found.</div>
              ) : (
                filteredLibrary.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleAddSkill(f.id, f.name.replace(/\.[^.]+$/, ""))}
                    className="text-left p-3 border-2 border-black hover:bg-black hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="text-[13px] font-black truncate pr-4">{f.name}</span>
                    <span className="text-[10px] font-bold uppercase shrink-0">Track &rarr;</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
