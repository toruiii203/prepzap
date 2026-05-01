import { useState } from "react"
import { Link } from "react-router-dom"
import { ToolPageShell } from "@/pages/ToolPageShell"
import { Check, X, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const TEAL = "#00C4B4"
const GOLD = "#E8B923"

const plans = [
  {
    id: "free",
    name: "Free",
    icon: "🎒",
    monthly: 0,
    annual: 0,
    borderColor: "#252525",
    badge: null,
    cta: "Get Started Free",
    ctaColor: "#252525",
    features: [
      { label: "50 AI credits / month (resets daily: 2/day)", included: true  },
      { label: "Practice mode (limited)",                      included: true  },
      { label: "Flashcards (up to 3 decks)",                   included: true  },
      { label: "Focus timer",                                   included: true  },
      { label: "Study planner (7 sessions)",                    included: true  },
      { label: "Math Solver (5 solves / day)",                  included: true  },
      { label: "Analytics (basic)",                             included: true  },
      { label: "Feynman Mode",                                  included: false },
      { label: "AI Tutor (unlimited)",                          included: false },
      { label: "Upload & sync files",                           included: false },
      { label: "Source Library (NotebookLM-style)",             included: false },
      { label: "Roadmap Generator",                             included: false },
      { label: "Priority support",                              included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: "⚡",
    monthly: 9.99,
    annual: 6.99,
    borderColor: TEAL,
    badge: "Most Popular",
    cta: "Start 7-Day Free Trial",
    ctaColor: TEAL,
    features: [
      { label: "500 AI credits / month (~17/day)",              included: true  },
      { label: "Practice mode (unlimited)",                     included: true  },
      { label: "Flashcards (unlimited decks)",                  included: true  },
      { label: "Focus timer",                                   included: true  },
      { label: "Study planner (unlimited)",                     included: true  },
      { label: "Math Solver (unlimited)",                       included: true  },
      { label: "Analytics (full + export)",                     included: true  },
      { label: "Feynman Mode",                                  included: true  },
      { label: "AI Tutor (unlimited)",                          included: true  },
      { label: "Upload & sync files",                           included: true  },
      { label: "Source Library (NotebookLM-style)",             included: true  },
      { label: "Roadmap Generator",                             included: false },
      { label: "Priority support",                              included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    icon: "👑",
    monthly: 19.99,
    annual: 15.99,
    borderColor: "#a78bfa",
    badge: "All Features",
    cta: "Start 7-Day Free Trial",
    ctaColor: "#a78bfa",
    features: [
      { label: "Unlimited AI credits (no daily cap)",           included: true  },
      { label: "Practice mode (unlimited)",                     included: true  },
      { label: "Flashcards (unlimited decks)",                  included: true  },
      { label: "Focus timer",                                   included: true  },
      { label: "Study planner (unlimited)",                     included: true  },
      { label: "Math Solver (unlimited)",                       included: true  },
      { label: "Analytics (full + export)",                     included: true  },
      { label: "Feynman Mode",                                  included: true  },
      { label: "AI Tutor (unlimited)",                          included: true  },
      { label: "Upload & sync files",                           included: true  },
      { label: "Source Library (NotebookLM-style)",             included: true  },
      { label: "Roadmap Generator",                             included: true  },
      { label: "Priority support",                              included: true  },
    ],
  },
]

const topUpCards = [
  { credits: "+100 credits",  price: "$1.99",  tag: "Quick boost",    best: false },
  { credits: "+500 credits",  price: "$7.99",  tag: "Power session",  best: true  },
  { credits: "+1500 credits", price: "$19.99", tag: "Month fuel",     best: false },
]

const faqs = [
  { q: "Can I cancel anytime?",               a: "Yes. Cancel anytime from Settings. You keep access until the end of your billing period — no surprise charges." },
  { q: "What counts as an AI credit?",        a: "One credit = one AI response (practice question, flashcard set, Feynman session, etc.). Generating 5 practice questions uses 1 credit." },
  { q: "Is there a student discount?",        a: "Yes! Students with a valid .edu email get 30% off Pro or Premium. Contact us at support@studenius.com to apply." },
  { q: "What payment methods are accepted?",  a: "We accept all major credit cards (Visa, Mastercard, Amex), GCash, and PayMaya for Philippine users." },
  { q: "Does the free trial require a card?", a: "No card needed to start your 7-day free trial. You'll only be charged after the trial ends if you choose to continue." },
  { q: "Can I switch plans?",                 a: "Absolutely. Upgrade or downgrade anytime — we'll prorate the difference automatically." },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <ToolPageShell>
      <main style={{ flex: 1, padding: "40px 16px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL, padding: "3px 10px", border: `0.5px solid rgba(0,196,180,0.3)`, background: "rgba(0,196,180,0.06)", display: "inline-block", marginBottom: 16 }}>
              SIMPLE PRICING
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: "#F0F0F0", margin: "0 0 12px", lineHeight: 1.2 }}>
              Study smarter.<br />
              <span style={{ background: `linear-gradient(135deg,${TEAL},#60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pay less than a coffee.</span>
            </h1>
            <p style={{ fontSize: 14, color: "#555", maxWidth: 440, margin: "0 auto 28px" }}>
              Start free. Upgrade when you're ready. Every plan includes access to Studenius's core study tools.
            </p>

            {/* Billing toggle */}
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "inline-flex", border: "0.5px solid #252525", background: "rgba(255,255,255,0.02)", padding: 3 }}>
                <button onClick={() => setAnnual(false)}
                  style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: !annual ? "rgba(255,255,255,0.08)" : "transparent", color: !annual ? "#F0F0F0" : "#555", fontFamily: "inherit", transition: "all .2s" }}>
                  Monthly
                </button>
                <button onClick={() => setAnnual(true)}
                  style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: annual ? "rgba(255,255,255,0.08)" : "transparent", color: annual ? "#F0F0F0" : "#555", fontFamily: "inherit", transition: "all .2s", display: "flex", alignItems: "center", gap: 8 }}>
                  Annual
                  <span style={{ fontSize: 9, padding: "1px 5px", background: `rgba(0,196,180,0.12)`, color: TEAL, fontWeight: 700 }}>SAVE 20%</span>
                </button>
              </div>
              {annual && <p style={{ fontSize: 10, color: "#444" }}>Annual plans save you up to $36/year</p>}
            </div>
          </div>

          {/* Plans */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 12 }}>
            {plans.map(plan => {
              const price = annual ? plan.annual : plan.monthly
              return (
                <div key={plan.id} style={{ position: "relative", border: `0.5px solid ${plan.borderColor}`, background: "rgba(255,255,255,0.02)", padding: 24 }}>
                  {plan.badge && (
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)" }}>
                      <span style={{ fontSize: 9, padding: "2px 10px", background: plan.borderColor, color: "#0A0A0A", fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                        {plan.badge.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>{plan.icon}</div>
                    <h2 style={{ fontSize: 16, fontWeight: 900, color: "#F0F0F0", margin: "0 0 10px" }}>{plan.name}</h2>
                    {price === 0 ? (
                      <div style={{ fontSize: 32, fontWeight: 900, color: "#F0F0F0" }}>Free</div>
                    ) : (
                      <div>
                        <span style={{ fontSize: 32, fontWeight: 900, color: "#F0F0F0" }}>${price}</span>
                        <span style={{ fontSize: 12, color: "#555" }}>/mo</span>
                      </div>
                    )}
                    {annual && price > 0 && (
                      <p style={{ fontSize: 10, color: "#444", marginTop: 4 }}>Billed ${(price * 12).toFixed(0)}/year</p>
                    )}
                  </div>

                  <Link to="/signup">
                    <button style={{ width: "100%", padding: "10px", background: plan.id === "free" ? "rgba(255,255,255,0.04)" : plan.ctaColor, border: `0.5px solid ${plan.id === "free" ? "#252525" : plan.ctaColor}`, color: plan.id === "free" ? "#C0C0C0" : "#0A0A0A", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", marginBottom: 20, transition: "opacity .2s" }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                      {plan.cta.toUpperCase()}
                    </button>
                  </Link>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                        {f.included
                          ? <Check style={{ width: 12, height: 12, color: plan.borderColor, flexShrink: 0 }} />
                          : <X style={{ width: 12, height: 12, color: "#2A2A2A", flexShrink: 0 }} />}
                        <span style={{ color: f.included ? "#C0C0C0" : "#333" }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Credit info note */}
          <div style={{ textAlign: "center", marginBottom: 48, fontSize: 10, color: "#444" }}>
            1 credit = 1 AI response (question set, flashcard batch, tutor reply, etc.)
          </div>

          {/* Top-Up */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F0F0F0", margin: "0 0 4px" }}>Need more credits?</h2>
              <p style={{ fontSize: 12, color: "#555", margin: 0 }}>One-time top-ups — no subscription required</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, maxWidth: 600, margin: "0 auto" }}>
              {topUpCards.map(card => (
                <div key={card.credits} style={{ position: "relative", border: `0.5px solid ${card.best ? TEAL : "#252525"}`, background: "rgba(255,255,255,0.02)", padding: "18px 16px", textAlign: "center" }}>
                  {card.best && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)" }}>
                      <span style={{ fontSize: 9, padding: "2px 8px", background: TEAL, color: "#0A0A0A", fontWeight: 700 }}>BEST VALUE</span>
                    </div>
                  )}
                  <Zap style={{ width: 20, height: 20, color: GOLD, margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 14, fontWeight: 900, color: "#F0F0F0", margin: "0 0 2px" }}>{card.credits}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#F0F0F0", margin: "0 0 4px" }}>{card.price}</p>
                  <p style={{ fontSize: 10, color: "#555", margin: "0 0 12px" }}>{card.tag}</p>
                  <Link to="/signup">
                    <button style={{ width: "100%", padding: "7px", background: card.best ? TEAL : "rgba(255,255,255,0.04)", border: `0.5px solid ${card.best ? TEAL : "#252525"}`, color: card.best ? "#0A0A0A" : "#C0C0C0", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      BUY CREDITS
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Trust signals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 48 }}>
            {[
              { icon: "🔒", label: "Secure payments",  sub: "Powered by Stripe" },
              { icon: "🔄", label: "Cancel anytime",   sub: "No lock-in contracts" },
              { icon: "🎓", label: "Student discount", sub: "30% off with .edu email" },
              { icon: "💬", label: "24/7 support",     sub: "Fast response, real humans" },
            ].map(({ icon, label, sub }) => (
              <div key={label} style={{ textAlign: "center", padding: 16, background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A1A1A" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#C0C0C0", margin: "0 0 3px" }}>{label}</p>
                <p style={{ fontSize: 10, color: "#555", margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F0F0F0", textAlign: "center", marginBottom: 24 }}>Full Comparison</h2>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid #1E1E1E" }}>
                    <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "#555", fontWeight: 600 }}>Feature</th>
                    {plans.map(p => (
                      <th key={p.id} style={{ textAlign: "center", padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#F0F0F0" }}>
                        {p.icon} {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["AI Credits",            "50/mo",   "500/mo",   "Unlimited"],
                    ["Practice Questions",    "Limited", "Unlimited","Unlimited"],
                    ["Flashcard Decks",       "3",       "Unlimited","Unlimited"],
                    ["Math Solver",           "5/day",   "Unlimited","Unlimited"],
                    ["Feynman Mode",          false,     true,       true],
                    ["AI Tutor",              false,     true,       true],
                    ["File Upload & Sync",    false,     true,       true],
                    ["Source Library",        false,     true,       true],
                    ["Roadmap Generator",     false,     false,      true],
                    ["Analytics Export",      false,     true,       true],
                    ["Priority Support",      false,     false,      true],
                  ].map(([feature, ...vals], i) => (
                    <tr key={i} style={{ borderBottom: "0.5px solid #111", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#999" }}>{feature}</td>
                      {vals.map((v, j) => (
                        <td key={j} style={{ padding: "10px 14px", textAlign: "center" }}>
                          {v === true  ? <Check style={{ width: 12, height: 12, color: TEAL, margin: "0 auto" }} /> :
                           v === false ? <X style={{ width: 12, height: 12, color: "#2A2A2A", margin: "0 auto" }} /> :
                           <span style={{ fontSize: 11, color: "#C0C0C0" }}>{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ maxWidth: 640, margin: "0 auto 48px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F0F0F0", textAlign: "center", marginBottom: 24 }}>Frequently Asked Questions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ border: "0.5px solid #252525", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                  <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: "#C0C0C0", fontFamily: "inherit", textAlign: "left", gap: 12 }}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{faq.q}</span>
                    {openFaq === i ? <ChevronUp style={{ width: 14, height: 14, color: "#555", flexShrink: 0 }} /> : <ChevronDown style={{ width: 14, height: 14, color: "#555", flexShrink: 0 }} />}
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: "0 16px 14px", fontSize: 12, color: "#555", borderTop: "0.5px solid #1A1A1A", paddingTop: 12, lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ textAlign: "center", border: `0.5px solid rgba(0,196,180,0.2)`, background: "rgba(0,196,180,0.03)", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#F0F0F0", margin: "0 0 10px" }}>Ready to study smarter?</h2>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
              Join thousands of students already using Studenius to ace their exams.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/signup">
                <button style={{ padding: "12px 32px", background: TEAL, border: "none", color: "#0A0A0A", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>
                  START FOR FREE
                </button>
              </Link>
              <Link to="/dashboard">
                <button style={{ padding: "12px 32px", background: "transparent", border: "0.5px solid #252525", color: "#C0C0C0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  See Dashboard →
                </button>
              </Link>
            </div>
            <p style={{ fontSize: 10, color: "#333", marginTop: 16 }}>No credit card required · Cancel anytime · 7-day free trial on paid plans</p>
          </div>

        </div>
      </main>
    </ToolPageShell>
  )
}
