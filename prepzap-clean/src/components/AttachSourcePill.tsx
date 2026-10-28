import React from "react";
import { useNavigate } from "react-router-dom";
import { getActiveSource, saveContext } from "@/lib/sourceContext";

export function AttachSourcePill() {
  const navigate = useNavigate();
  // Using activeSourceForDep to force re-render if it changes via window event? 
  // Wait, no, we need to listen to onSourceChange if we want it to be reactive, 
  // but Arcade games are re-mounted or we can just read it since it's just a pill.
  // Actually, we'll use a local state and listen to onSourceChange.
  
  const [activeSource, setActiveSource] = React.useState(getActiveSource());
  
  React.useEffect(() => {
    const handleStorage = () => setActiveSource(getActiveSource());
    window.addEventListener("pz_source_changed", handleStorage);
    return () => window.removeEventListener("pz_source_changed", handleStorage);
  }, []);

  const handleClearSource = () => {
    saveContext({ mode: "none", selectedIds: [] });
    setActiveSource(null);
  };

  if (activeSource) {
    return (
      <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0]">
        <span className="material-symbols-outlined text-[16px]">description</span>
        <span className="text-[12px] font-bold truncate max-w-[200px]">{activeSource.name}</span>
        <button onClick={handleClearSource} className="material-symbols-outlined text-[14px] hover:text-[#10B981] transition-colors">close</button>
      </div>
    );
  }

  return (
    <button onClick={() => navigate("/sources")}
      className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] hover:bg-[#E2E2E2] text-[12px] font-bold transition-colors">
      <span className="material-symbols-outlined text-[16px]">attach_file</span>
      Attach Source
    </button>
  );
}
