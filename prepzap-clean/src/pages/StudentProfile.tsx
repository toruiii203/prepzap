import { useState, useEffect } from "react";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadLibrary } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";

// ─── helpers ────────────────────────────────────────────────────────────────

function getLocalNumber(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") return parsed;
    if (Array.isArray(parsed)) return parsed.length;
    return fallback;
  } catch {
    return fallback;
  }
}

function getJoinDate(isoString?: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Desktop sidebar ─────────────────────────────────────────────────────────

// ─── Hub card (shared) ───────────────────────────────────────────────────────

const HubCard = ({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group bg-[#FAF7F2] border-2 border-black p-8 flex flex-col text-left transition-all hover:bg-[#F0EDE0] active:translate-x-0.5 active:translate-y-0.5"
    style={{ boxShadow: "5px 5px 0px #000", minHeight: 220 }}
    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translate(3px,3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0px #000"; }}
    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000"; }}
  >
    <div className="flex items-start justify-between mb-6">
      <div className="w-14 h-14 bg-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_#555]">
        <span className="material-symbols-outlined text-white text-[28px]">{icon}</span>
      </div>
      <span className="material-symbols-outlined text-[20px] text-black/40 group-hover:translate-x-1 transition-transform">
        arrow_forward
      </span>
    </div>
    <h4 className="font-black text-[18px] mb-2">{label}</h4>
    <p className="text-[14px] font-medium text-black/60 mt-auto leading-relaxed">{description}</p>
  </button>
);

// ─── Stat card (shared) ──────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: string;
}) => (
  <div
    className="bg-[#FAF7F2] border-2 border-black p-6 flex flex-col"
    style={{ boxShadow: "5px 5px 0px #000" }}
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] font-black uppercase tracking-widest text-black/50">{label}</p>
      {icon && (
        <span className="material-symbols-outlined text-[20px]" style={{ color: accent || "#000" }}>
          {icon}
        </span>
      )}
    </div>
    <p
      className="font-black text-[32px] leading-none mt-1"
      style={{ color: accent || "#000" }}
    >
      {value}
    </p>
    {sub && <p className="text-[12px] font-bold text-black/40 mt-2">{sub}</p>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentProfile() {
  const navigate = useNavigate();
  const { isPro } = usePlan();
  const { user, profile } = useAuth();

  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("S");
  const [joinDate, setJoinDate] = useState("—");
  const { stats } = useStudyStats();
  const [sourceCount, setSourceCount] = useState(0); SharedSidebar } from "@/components/SharedSidebar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadLibrary } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "@/hooks/useStudyStats";

// ─── helpers ────────────────────────────────────────────────────────────────

function getLocalNumber(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") return parsed;
    if (Array.isArray(parsed)) return parsed.length;
    return fallback;
  } catch {
    return fallback;
  }
}

function getJoinDate(isoString?: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Desktop sidebar ─────────────────────────────────────────────────────────

// ─── Hub card (shared) ───────────────────────────────────────────────────────

const HubCard = ({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group bg-[#FAF7F2] border-2 border-black p-8 flex flex-col text-left transition-all hover:bg-[#F0EDE0] active:translate-x-0.5 active:translate-y-0.5"
    style={{ boxShadow: "5px 5px 0px #000", minHeight: 220 }}
    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translate(3px,3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0px #000"; }}
    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000"; }}
  >
    <div className="flex items-start justify-between mb-6">
      <div className="w-14 h-14 bg-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_#555]">
        <span className="material-symbols-outlined text-white text-[28px]">{icon}</span>
      </div>
      <span className="material-symbols-outlined text-[20px] text-black/40 group-hover:translate-x-1 transition-transform">
        arrow_forward
      </span>
    </div>
    <h4 className="font-black text-[18px] mb-2">{label}</h4>
    <p className="text-[14px] font-medium text-black/60 mt-auto leading-relaxed">{description}</p>
  </button>
);

// ─── Stat card (shared) ──────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: string;
}) => (
  <div
    className="bg-[#FAF7F2] border-2 border-black p-6 flex flex-col"
    style={{ boxShadow: "5px 5px 0px #000" }}
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] font-black uppercase tracking-widest text-black/50">{label}</p>
      {icon && (
        <span className="material-symbols-outlined text-[20px]" style={{ color: accent || "#000" }}>
          {icon}
        </span>
      )}
    </div>
    <p
      className="font-black text-[32px] leading-none mt-1"
      style={{ color: accent || "#000" }}
    >
      {value}
    </p>
    {sub && <p className="text-[12px] font-bold text-black/40 mt-2">{sub}</p>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

