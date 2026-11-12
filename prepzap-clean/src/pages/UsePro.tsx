import { Mascot } from "@/components/Mascot";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PAYMENT_LINKS = {
  Weekly:  "https://pm.link/org-b4mCLPwtvE3WeakTgzqDMC7Q/RhaIdBU",
  Monthly: "https://pm.link/org-b4mCLPwtvE3WeakTgzqDMC7Q/RhaIdBU",
  Yearly:  "https://pm.link/org-b4mCLPwtvE3WeakTgzqDMC7Q/iL2OO3b",
} as const;

const PAYPAL_SANDBOX_DEMO = import.meta.env.VITE_PAYPAL_SANDBOX_DEMO === "true";

export default function UsePro() {
  const navigate = useNavigate();
  const { user, profile, session } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"Weekly" | "Monthly" | "Yearly">("Monthly");
  const [redirecting, setRedirecting] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState("");
  const handledReturn = useRef(false);

  const handleUpgrade = () => {
    if (isAlreadyPro) return;
    setRedirecting(true);
    const userId = user?.id ?? "";
    window.location.href = `${PAYMENT_LINKS[billingCycle]}?user_id=${encodeURIComponent(userId)}`;
  };

  const handlePayPal = async () => {
    if (isAlreadyPro || redirecting) return;
    if (!PAYPAL_SANDBOX_DEMO) {
      setSandboxStatus("PayPal checkout is paused until payment verification is securely configured. No charge was started.");
      return;
    }
    if (!session?.access_token) {
      setSandboxStatus("Sign in to your Studenius account before opening the sandbox demonstration.");
      return;
    }
    setRedirecting(true);
    setSandboxStatus("Preparing a PayPal Sandbox order (no real money).");
    try {
      const result = await fetch("/api/paypal-sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ action: "create", plan: billingCycle }),
      });
      const data = await result.json();
      if (!result.ok || typeof data.approvalUrl !== "string") throw new Error(data.error || "Sandbox checkout is unavailable.");
      const approval = new URL(data.approvalUrl);
      if (approval.protocol !== "https:" || !/(^|\.)sandbox\.paypal\.com$/.test(approval.hostname))
        throw new Error("PayPal returned an unrecognized sandbox destination.");
      window.location.assign(approval.toString());
    } catch (error) {
      setSandboxStatus(error instanceof Error ? error.message : "Sandbox checkout unavailable.");
      setRedirecting(false);
    }
  };

  const isAlreadyPro = profile?.plan === "pro";

  // Only a verified server-side PayPal Sandbox capture can display a demo receipt.
  // Never activate a paid production entitlement from a no-money sandbox order.
  useEffect(() => {
    if (!PAYPAL_SANDBOX_DEMO || handledReturn.current || !session?.access_token) return;
    const search = new URLSearchParams(window.location.search);
    const state = search.get("paypal_demo");
    if (state !== "approved" && state !== "cancelled") return;
    handledReturn.current = true;
    if (state === "cancelled") {
      setSandboxStatus("PayPal Sandbox checkout cancelled; no payment was made.");
      return;
    }
    const orderId = search.get("token");
    if (!orderId || !/^[A-Z0-9]{8,32}$/i.test(orderId)) {
      setSandboxStatus("Invalid PayPal order return. No membership was changed.");
      return;
    }
    const finish = async () => {
      setRedirecting(true);
      setSandboxStatus("Verifying the PayPal Sandbox order with the server...");
      try {
        const response = await fetch("/api/paypal-sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
          body: JSON.stringify({ action: "capture", orderId }),
        });
        const data = await response.json();
        if (!response.ok || data.sandbox !== true || data.captured !== true || data.premiumGranted !== false)
          throw new Error(data.error || "Sandbox capture not confirmed.");
        setSandboxStatus("Sandbox capture confirmed. This was a test transaction; no real payment or paid Pro membership was created.");
      } catch (error) {
        setSandboxStatus(error instanceof Error ? error.message : "Sandbox capture could not be confirmed.");
      } finally {
        setRedirecting(false);
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
    };
    void finish();
  }, [session?.access_token]);

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
          <div className="absolute inset-0 bg-[#10B981]/25 rounded-full blur-3xl opacity-40 z-0"></div>
          
          <Mascot mood="happy" size="lg" className="relative z-10" />
          
          <div className="absolute bottom-6 left-1/4 text-primary z-20 animate-pulse">
            <span className="material-symbols-outlined text-[20px] text-[#FFD13B]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
        </section>

        {/* Billing Toggle */}
        <section className="flex justify-center items-center">
          <div className="flex items-center bg-[#FAF7F2] rounded-full p-1 border-2 border-[#1c1c19]">
            <button 
              onClick={() => setBillingCycle("Weekly")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
                billingCycle === "Weekly" 
                   ? "bg-black text-[#faf7f2]" 
                  : "text-on-surface-variant"
              }`}
            >
              7-Day Sprint
            </button>
            <button 
              onClick={() => setBillingCycle("Monthly")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
                billingCycle === "Monthly" 
                   ? "bg-black text-[#faf7f2]" 
                  : "text-on-surface-variant"
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle("Yearly")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "Yearly" 
                  ? "bg-black text-[#faf7f2]" 
                  : "text-on-surface-variant"
              }`}
            >
              Yearly
              <span className="bg-[#FFD13B] text-black text-[9px] px-2 py-0.5 rounded-full border border-black font-extrabold scale-90">
                -37%
              </span>
            </button>
          </div>
        </section>

        {/* Pricing Cards Container */}
        <section className="flex flex-col gap-5">
          
          {/* Pro Plan Card */}
          <div className="bg-[#10B981] text-white rounded-2xl border-2 border-black p-6 relative overflow-hidden shadow-[4px_4px_rgba(0,0,0,1)]">
            <div className="absolute top-0 right-0 bg-[#feae2c] text-black text-[10.5px] font-extrabold px-3.5 py-1 rounded-bl-xl border-l border-b border-black">
              MOST POPULAR
            </div>
            
            <div className="mb-4 pt-1">
              <h3 className="text-headline-lg font-headline font-extrabold mb-1.5 text-[21px]">Studenius VIP</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[32px] font-extrabold">
                  {billingCycle === "Weekly" ? "₱79" : billingCycle === "Monthly" ? "₱199" : "₱1,499"}
                </span>
                <span className="text-[14px] opacity-85 font-semibold">
                  {billingCycle === "Weekly" ? " (7-day pass)" : billingCycle === "Monthly" ? "/month" : "/year"}
                </span>
              </div>
            </div>

            <ul className="flex flex-col gap-4 mb-2 mt-4 text-[#FAF7F2]">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#feae2c] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-[14.5px] font-bold">Unlimited Real-Time Pip Tutor</span>
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
                <span>Pip Tutor (Limited daily token usage)</span>
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

              {/* PayPal */}
              <button
                onClick={handlePayPal}
                disabled={redirecting || !PAYPAL_SANDBOX_DEMO}
                className="w-full bg-[#ffc439] hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed font-headline text-[#1c1c19] font-extrabold py-4 px-6 rounded-xl border-2 border-[#1c1c19] text-center flex items-center justify-center gap-2 shadow-[3px_3px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-[15px]"
              >
                {redirecting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Redirecting...</span>
                  </>
                ) : (
                  <>
                    <span>{PAYPAL_SANDBOX_DEMO ? "Try PayPal Sandbox (test only)" : "Pay with PayPal"}</span>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
                  </>
                )}
              </button>
              {PAYPAL_SANDBOX_DEMO ? <p className="text-xs font-semibold text-zinc-700">Sandbox test only: no real payment or production subscription will be created.</p> : <p className="text-xs font-semibold text-zinc-700">PayPal checkout is temporarily paused pending merchant verification. No PayPal charge can be started here.</p>}
              {sandboxStatus && <p role="status" className="text-sm font-semibold text-zinc-800" aria-live="polite">{sandboxStatus}</p>}
            </div>
          )}
          
        </section>
      </main>
    </div>
  );
}

