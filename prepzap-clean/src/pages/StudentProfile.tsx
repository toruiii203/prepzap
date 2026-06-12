import { useNavigate } from "react-router-dom";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentProfile() {
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth() as any;

  const displayName = profile?.full_name || profile?.name || user?.name || user?.email?.split('@')[0] || "Master (You)";
  const levelVal = profile?.level || user?.level || 1;
  const xpVal = profile?.total_xp || profile?.xp || user?.xp || 0;
  const coinVal = profile?.coins || user?.coins || 0;

  return (
    <div className="bg-[#FAF7F2] text-[#1A1A1A] font-body-md min-h-full px-5 pt-4 pb-28 select-none w-full flex-1">
      <header className="sticky top-0 z-40 flex justify-between items-center h-16 bg-[#FAF7F2] border-b-2 border-[#1A1A1A] -mx-5 px-5 mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          <h1 className="text-headline-lg font-headline font-bold text-[#1A1A1A] text-[21.5px]">Studenius</h1>
        </div>
        <button 
          onClick={() => navigate("/go-pro")}
          className="bg-[#e9f2ff] border-2 border-[#1A1A1A] text-[11px] font-bold text-black px-4 py-1.5 rounded-full uppercase tracking-wide shrink-0 shadow-[2px_2px_0px_#1A1A1A]"
        >
          PRO
        </button>
      </header>

      <main className="pb-4">
        {/* Profile Header Section */}
        <section className="flex flex-col items-center justify-center pt-8">
          <div className="relative w-32 h-32 rounded-full border-2 border-[#1A1A1A] overflow-hidden bg-white flex items-center justify-center p-1 shadow-[4px_4px_0px_#1A1A1A]">
            <img 
              alt="Avatar of Rex in a graduate outfit" 
              className="w-full h-full object-cover rounded-full border-2 border-[#1A1A1A] select-none" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuByLxcKeJKZOUK-T9K4BLDBmVE4cdsrfFbvTfM2Hn_SsJiZ9j7H2WOxxNYDoG_wY9GvfkXvLGEE3F-qgOZYNBNvI-zTj995Kglquh_Vq17rhk6o38ccfU7Z4MbVFpaTozlypkp9LYggWz5C4FY5edoB0T_5HimSfoTxluDWoyuRbdtwrBI2GUheDwjP54FZeRSb8zi2MSBFjl90kxMk4s-1ZZgm6CI6N4J6XRTfMpJZrRYJM0xe2wcHand16SgHMJFpZppWFGvnzlq0"
            />
          </div>
          <h2 className="text-headline-xl font-headline text-[24px] font-extrabold text-[#1A1A1A] mt-4 text-center">
            {displayName}
          </h2>
          <p className="text-body-md font-body-md text-slate-500 text-[14.5px] mt-1 text-center font-bold opacity-60">
            Level {levelVal} /// {xpVal} XP ({coinVal} Coins)
          </p>
        </section>

        {/* Stats Row Bento boxes */}
        <section className="grid grid-cols-3 gap-3.5 mt-8">
          <div className="bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-4 flex flex-col items-center justify-center hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all cursor-default shadow-[2px_2px_0px_#1A1A1A] min-h-[90px]">
            <span className="text-headline-md font-headline font-bold text-[#1A1A1A] text-[19px]">142</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 font-headline">Sessions</span>
          </div>
          
          <div className="bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-4 flex flex-col items-center justify-center hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all cursor-default shadow-[2px_2px_0px_#1A1A1A] min-h-[90px]">
            <span className="text-headline-md font-headline font-bold text-[#1A1A1A] text-[19px]">48h</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 font-headline">Study Time</span>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-4 flex flex-col items-center justify-center hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all cursor-default shadow-[2px_2px_0px_#1A1A1A] min-h-[90px]">
            <span className="text-headline-md font-headline font-bold text-primary text-[19px]">92%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 font-headline">Avg Score</span>
          </div>
        </section>

        <section className="flex flex-col gap-4 mt-8">
          <button
            onClick={() => navigate("/sources")}
            className="w-full flex items-center justify-between bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">library_books</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Source Library</span>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => navigate("/avatar")}
            className="w-full flex items-center justify-between bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-[#feae2c] text-xl group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>checkroom</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Avatar & Cosmetics</span>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => navigate("/analytics")}
            className="w-full flex items-center justify-between bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">bar_chart</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Analytics</span>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center justify-between bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-[#1A1A1A] text-xl group-hover:scale-110 transition-transform">settings</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Settings</span>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => navigate("/go-pro")}
            className="w-full flex items-center justify-between border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group bg-[#ffdad6]"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Go Pro</span>
            </div>
            <span className="material-symbols-outlined text-[#ae2925] text-[18px]">arrow_forward</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Use your browser menu → Install app / Add to Home Screen to download Studenius.")}
            className="w-full flex items-center justify-between bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-[#1A1A1A] text-xl group-hover:scale-110 transition-transform">install_mobile</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Download App</span>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={() => navigate("/privacy")}
            className="w-full flex items-center justify-between bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="material-symbols-outlined text-[#1A1A1A] text-xl group-hover:scale-110 transition-transform">policy</span>
              <span className="text-[15.5px] text-[#1A1A1A] font-extrabold font-headline">Privacy & Terms</span>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
          </button>

          <button
            onClick={async () => {
              setShowLogoutModal(true);
  };
  const doLogout = async () => {
                await signOut();
                navigate("/login");
              }
            }}
            className="w-full flex items-center justify-center bg-white border-2 border-[#1A1A1A] border-b-4 rounded-xl p-5 hover:bg-red-50 hover:border-red-900 active:translate-y-0 active:border-b-2 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-xl shrink-0">logout</span>
              <span className="text-[15.5px] text-error font-extrabold font-headline">Log Out</span>
            </div>
          </button>
        </section>
      </main>
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="bg-[#FAF7F2] border-2 border-black rounded-2xl p-6 w-full max-w-sm shadow-[4px_4px_0px_0px_#000]">
            <h2 className="font-extrabold text-[17px] mb-2">Log out?</h2>
            <p className="text-[14px] text-black/60 mb-5">You'll need to sign in again to access Studenius.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 border-2 border-black rounded-xl font-bold text-[14px]">Cancel</button>
              <button onClick={doLogout} className="flex-1 py-3 bg-[#ae2925] text-white border-2 border-black rounded-xl font-bold text-[14px] shadow-[3px_3px_0px_0px_#000]">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
