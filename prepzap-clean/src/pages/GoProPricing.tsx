import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PAYMENT_LINKS = {
  Monthly: "https://pm.link/org-b4mCLPwtvE3WeakTgzqDMC7Q/RhaIdBU",
  Yearly:  "https://pm.link/org-b4mCLPwtvE3WeakTgzqDMC7Q/iL2OO3b",
} as const;

const PAYPAL_LINKS = {
  Monthly: "https://www.paypal.com/ncp/payment/PUK26H6FCJZL2",
  Yearly:  "https://www.paypal.com/ncp/payment/UU56A82ZUTHQ6",
} as const;

export default function GoProPricing() {
  const navigate = useNavigate();
  const { user, profile } = useAuth() as any;
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [redirecting, setRedirecting] = useState(false);

  const handleUpgrade = () => {
    if (isAlreadyPro) return;
    setRedirecting(true);
    const userId = user?.id ?? "";
    window.location.href = `${PAYMENT_LINKS[billingCycle]}?user_id=${encodeURIComponent(userId)}`;
  };

  const handlePayPal = () => {
    if (isAlreadyPro) return;
    setRedirecting(true);
    window.location.href = PAYPAL_LINKS[billingCycle];
  };

  const isAlreadyPro = profile?.is_pro === true;

  return (
    <div className="bg-[#fcf9f4] text-on-surface font-body-md min-h-full pb-24 pt-4 w-full flex-1 relative overflow-y-auto">
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
                  {billingCycle === "Monthly" ? "₱199" : "₱1,499"}
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
                <span className="text-[23px] font-extrabold">₱0</span>
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
          {isAlreadyPro ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-[#feae2c] font-headline text-[#1c1c19] font-extrabold py-4 px-6 rounded-xl border-2 border-[#1c1c19] text-center flex items-center justify-center gap-1 shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all mt-1 cursor-pointer text-[15px]"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span>You're already VIP!</span>
            </button>
          ) : (
            <div className="w-full flex flex-col gap-3">
              {/* PayMongo — GCash, Maya, cards, online banking */}
              <button
                onClick={handleUpgrade}
                disabled={redirecting}
                className="w-full bg-[#FAF7F2] hover:bg-black hover:text-[#FAF7F2] disabled:opacity-60 disabled:cursor-not-allowed font-headline text-[#1c1c19] font-extrabold py-4 px-6 rounded-xl border-2 border-[#1c1c19] text-center flex items-center justify-center gap-1 shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-[15px]"
              >
                {redirecting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Redirecting to payment…</span>
                  </>
                ) : (
                  <>
                    <span>Pay with GCash / Card</span>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
                  </>
                )}
              </button>

              {/* PayPal — international users */}
              <button
                onClick={handlePayPal}
                disabled={redirecting}
                className="w-full bg-[#FFC439] hover:bg-[#f0b429] disabled:opacity-60 disabled:cursor-not-allowed font-headline text-[#003087] font-extrabold py-4 px-6 rounded-xl border-2 border-[#003087] text-center flex items-center justify-center gap-2 shadow-[3px_3px_rgba(0,0,48,0.3)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-[15px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#003087" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.771.771 0 0 1 .76-.645h6.966c2.373 0 4.062.559 5.022 1.662.928 1.063 1.17 2.354.74 3.945-.028.108-.056.218-.087.33-.976 3.998-4.32 5.375-8.59 5.375H7.56a.77.77 0 0 0-.761.651l-.882 5.508a.64.64 0 0 1-.632.54l-.209.251z"/>
                  <path d="M19.873 8.4c-.972 4.153-4.238 6.243-9.016 6.243H8.58l-1.18 7.34h3.504l.903-5.643h2.27c4.27 0 7.614-1.377 8.59-5.375.43-1.591.188-2.882-.794-3.565z" fill="#009cde"/>
                </svg>
                <span>Pay with PayPal</span>
              </button>
            </div>
          )}
          <p className="text-[12.5px] font-bold text-on-surface-variant mt-3 opacity-60">
            GCash · Maya · Cards · PayPal · Cancel anytime
          </p>
        </section>
      </main>
    </div>
  );
}
