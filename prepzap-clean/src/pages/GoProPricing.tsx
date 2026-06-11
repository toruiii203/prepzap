import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface GoProPricingProps {
}

export default function GoProPricing() {
  const { user, profile, refreshProfile } = useAuth() as any;
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Yearly">("Monthly");

  const handleUpgrade = async () => {
    if (user && profile) {
      try {
        await supabase
          .from("profiles")
          .update({ is_pro: true })
          .eq("id", user.id);
        if (typeof refreshProfile === "function") {
          await refreshProfile();
        }
      } catch (err) {
        console.error("Error setting pro status:", err);
      }
    }
    
    navigate("/dashboard");
  };

  const isAlreadyPro = profile?.is_pro === true;

  return (
    <div className="bg-[#fcf9f4] text-on-surface font-body-md min-h-screen pb-24 pt-4 w-full max-w-[390px] mx-auto border-x border-black/10 shadow-xl relative overflow-y-auto flex-1">
      {/* Top App Bar */}
      <header className="sticky top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 bg-[#FAF7F2] border-b-2 border-on-surface navbar-custom">
        <button 
          onClick={() => navigate("/dashboard")}
          aria-label="Go Back" 
          className="text-primary hover:opacity-80 transition-transform active:translate-y-0.5 border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold pr-4 flex-1 text-center">Studenius VIP</span>
        <button 
          className="text-label-md font-bold text-primary hover:opacity-80 active:translate-y-0.5 px-4 py-1.5 bg-[#FAF7F2] rounded-full border-2 border-on-surface text-[12px]"
        >
          PRO
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="px-5 flex flex-col gap-6 pb-8 pt-4">
        {/* Header Section */}
        <section className="text-center">
          <h2 className="text-headline-xl font-headline text-[23.5px] font-extrabold text-on-surface mb-1.5">
            Optimize Your Study Efficiency
          </h2>
          <p className="text-body-lg font-body-md text-on-surface-variant max-w-sm mx-auto text-[15px] font-semibold">
            Unlock advanced AI reasoning, larger source limits, and smart widgets.
          </p>
        </section>

        {/* Mascot / Hero Graphic */}
        <section className="flex justify-center items-center py-2 relative">
          <div className="absolute inset-0 bg-[#ffddb4] rounded-full blur-3xl opacity-40 z-0"></div>
          
          <img 
            alt="Mascot graduation cap" 
            className="w-36 h-36 object-cover rounded-full z-10 border-2 border-on-surface shadow-xl bg-white p-1 select-none" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBI2f_uyC4HYrklceINtsGasmZVALcqCgkTwdsNpE9LycFvywKAYKC0hyrn0hwxDZKshun9yfnwrNeWahC4kn_xau7vC71Zg5iKl7E_MR2kdN31NEAg40yP9nq1pUn8NOMCOYtZVg4bgijv6FAkfz64GJx-GBIR_bs1UO_PDQ96iZHYNKhr-UC6n2ngcpmTtaVactHIb6TBVRaBkkySX3wkgImatWyUFiwJ07uOmq8bYgNT8cgjOr83A74oRxH73IENCOxQpc2vKMcx"
          />
          <div className="absolute top-2 right-1/4 text-secondary-container z-20 animate-pulse">
            <span className="material-symbols-outlined text-[20px] text-yellow-600" style={{ fontVariationSettings: "'FILL' 1" }}>sparkle</span>
          </div>
          <div className="absolute bottom-6 left-1/4 text-primary z-20 animate-pulse">
            <span className="material-symbols-outlined text-[20px] text-[#E8534A]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
        </section>

        {/* Billing Toggle */}
        <section className="flex justify-center items-center">
          <div className="flex items-center bg-[#FAF7F2] rounded-full p-1 border-2 border-[#1c1c19]">
            <button 
              onClick={() => setBillingCycle("Monthly")}
              className={`px-5 py-1.5 rounded-full text-[13.5px] font-bold transition-colors cursor-pointer ${
                billingCycle === "Monthly" 
                   ? "bg-black text-[#faf7f2]" 
                  : "text-on-surface-variant"
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle("Yearly")}
              className={`px-5 py-1.5 rounded-full text-[13.5px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "Yearly" 
                  ? "bg-black text-[#faf7f2]" 
                  : "text-on-surface-variant"
              }`}
            >
              Yearly
              <span className="bg-[#ffb4ab] text-black text-[9px] px-2 py-0.5 rounded-full border border-black font-extrabold scale-90">
                -37%
              </span>
            </button>
          </div>
        </section>

        {/* Pricing Cards Container */}
        <section className="flex flex-col gap-5">
          
          {/* Pro Plan Card */}
          <div className="bg-[#E8534A] text-white rounded-2xl border-2 border-[#1c1c19] p-6 relative overflow-hidden shadow-[4px_4px_rgba(0,0,0,1)]">
            <div className="absolute top-0 right-0 bg-[#feae2c] text-black text-[10.5px] font-extrabold px-3.5 py-1 rounded-bl-xl border-l border-b border-black">
              MOST POPULAR
            </div>
            
            <div className="mb-4 pt-1">
              <h3 className="text-headline-lg font-headline font-extrabold mb-1.5 text-[21px]">Studenius VIP</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[32px] font-extrabold">
                  {billingCycle === "Monthly" ? "///199" : "///1,499"}
                </span>
                <span className="text-[14px] opacity-85 font-semibold">
                  {billingCycle === "Monthly" ? "/month" : "/year"}
                </span>
              </div>
            </div>

            <ul className="flex flex-col gap-4 mb-2 mt-4 text-[#FAF7F2]">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#feae2c] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[14.5px] font-bold">Unlimited Real-Time AI Tutor</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#feae2c] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[14.5px] font-semibold">Unlock Full Spaced Revision Engine</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#feae2c] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[14.5px] font-semibold font-headline">Infinite Source Context Upload Size</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#feae2c] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[14.5px] font-semibold">Priority GPU Generation Speeds</span>
              </li>
            </ul>
          </div>

          {/* Free Plan Card */}
          <div className="bg-white text-black rounded-2xl border-2 border-[#1c1c19] p-6 shadow-[2px_2px_rgba(0,0,0,1)] opacity-90">
            <div className="mb-3">
              <h3 className="text-headline-md font-bold text-neutral-500 mb-1 text-[17px]">Standard Plan</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[23px] font-extrabold">///0</span>
                <span className="text-[13px] text-zinc-500 font-bold">/month</span>
              </div>
            </div>
            
            <ul className="flex flex-col gap-3 text-zinc-600 text-[13.5px] font-semibold">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined shrink-0 text-[16px] mt-0.5">check</span>
                <span>AI Tutor (Limited daily token usage)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined shrink-0 text-[16px] mt-0.5">check</span>
                <span>Basic flashcard creator mechanics</span>
              </li>
            </ul>
          </div>

        </section>

        {/* Action button */}
        <section className="mt-2 flex flex-col items-center">
          <button 
            onClick={handleUpgrade}
            className="w-full bg-[#FAF7F2] hover:bg-black hover:text-[#FAF7F2] font-headline text-[#1c1c19] font-extrabold py-4 px-6 rounded-xl border-2 border-[#1c1c19] text-center flex items-center justify-center gap-1 shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all mt-1 cursor-pointer text-[15px]"
          >
            <span>{isAlreadyPro ? "You are already PRO!" : "Upgrade to Studenius PRO"}</span>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
          </button>
          <p className="text-[12.5px] font-bold text-on-surface-variant mt-3 opacity-60">
            Secure, cancel anytime. Seamless trial integration.
          </p>
        </section>
      </main>
    </div>
  );
}
