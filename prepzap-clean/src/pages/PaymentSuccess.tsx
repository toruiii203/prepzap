import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "success" | "already_pro" | "error";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth() as any;
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const activate = async () => {
      // Not logged in — send to login
      if (!user) {
        navigate("/login");
        return;
      }

      // Already pro — nothing to do
      if (profile?.is_pro === true) {
        setStatus("already_pro");
        setTimeout(() => navigate("/dashboard"), 2500);
        return;
      }

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ is_pro: true })
          .eq("id", user.id);

        if (error) throw error;

        if (typeof refreshProfile === "function") {
          await refreshProfile();
        }

        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 3000);
      } catch (err) {
        console.error("Failed to activate pro:", err);
        setStatus("error");
      }
    };

    activate();
  }, [user, profile]);

  return (
    <div className="bg-[#fcf9f4] min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      {status === "loading" && (
        <>
          <span className="material-symbols-outlined text-[56px] text-[#E8534A] animate-spin">
            progress_activity
          </span>
          <div>
            <h1 className="font-headline font-extrabold text-[22px] text-[#1c1c19]">
              Activating your VIP…
            </h1>
            <p className="text-[14px] font-semibold text-on-surface-variant mt-1">
              Just a second while we unlock everything.
            </p>
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-20 h-20 rounded-full bg-[#feae2c] border-2 border-black flex items-center justify-center shadow-[4px_4px_rgba(0,0,0,1)]">
            <span
              className="material-symbols-outlined text-[40px] text-black"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          </div>
          <div>
            <h1 className="font-headline font-extrabold text-[24px] text-[#1c1c19]">
              You're now Studenius VIP!
            </h1>
            <p className="text-[14px] font-semibold text-on-surface-variant mt-1">
              All features unlocked. Redirecting to your dashboard…
            </p>
          </div>
        </>
      )}

      {status === "already_pro" && (
        <>
          <div className="w-20 h-20 rounded-full bg-[#feae2c] border-2 border-black flex items-center justify-center shadow-[4px_4px_rgba(0,0,0,1)]">
            <span
              className="material-symbols-outlined text-[40px] text-black"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          </div>
          <div>
            <h1 className="font-headline font-extrabold text-[24px] text-[#1c1c19]">
              You're already VIP!
            </h1>
            <p className="text-[14px] font-semibold text-on-surface-variant mt-1">
              Heading back to your dashboard…
            </p>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-20 h-20 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-[4px_4px_rgba(0,0,0,1)]">
            <span
              className="material-symbols-outlined text-[40px] text-[#E8534A]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>
          <div>
            <h1 className="font-headline font-extrabold text-[22px] text-[#1c1c19]">
              Something went wrong
            </h1>
            <p className="text-[14px] font-semibold text-on-surface-variant mt-1 max-w-xs mx-auto">
              Your payment went through but we couldn't activate your plan. Please contact us and we'll sort it out immediately.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-2 px-6 py-3 bg-[#FAF7F2] border-2 border-black rounded-xl font-headline font-extrabold text-[14px] shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          >
            Go to Dashboard
          </button>
        </>
      )}
    </div>
  );
}
