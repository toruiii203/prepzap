import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, ChevronDown, ChevronUp, Info, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    id: "free",
    name: "Free",
    icon: "🎒",
    monthly: 0,
    annual: 0,
    color: "border-border",
    badge: null,
    cta: "Get Started Free",
    ctaStyle: "bg-muted hover:bg-muted/80 text-foreground",
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
      { label: "Synthesis Lab",                                 included: false },
      { label: "Why Engine",                                    included: false },
      { label: "Roadmap Generator",                             included: false },
      { label: "Source Library (NotebookLM-style)",             included: false },
      { label: "Priority support",                              included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: "⚡",
    monthly: 9.99,
    annual: 6.99,
    color: "border-emerald-500 shadow-emerald-500/20 shadow-xl",
    badge: "Most Popular",
    cta: "Start 7-Day Free Trial",
    ctaStyle: "bg-white hover:bg-white/80 text-white",
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
      { label: "Synthesis Lab",                                 included: true  },
      { label: "Why Engine",                                    included: true  },
      { label: "Roadmap Generator",                             included: false },
      { label: "Source Library (NotebookLM-style)",             included: true  },
      { label: "Priority support",                              included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    icon: "👑",
    monthly: 19.99,
    annual: 15.99,
    color: "border-purple-500 shadow-purple-500/20 shadow-xl",
    badge: "All Features",
    cta: "Start 7-Day Free Trial",
    ctaStyle: "bg-gradient-to-r from-zinc-500 to-indigo-500 hover:from-zinc-600 hover:to-indigo-600 text-white border-0",
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
      { label: "Synthesis Lab",                                 included: true  },
      { label: "Why Engine",                                    included: true  },
      { label: "Roadmap Generator",                             included: true  },
      { label: "Source Library (NotebookLM-style)",             included: true  },
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
  { q: "Is there a student discount?",        a: "Yes! Students with a valid .edu email get 30% off Pro or Premium. Contact us at support@prepzap.com to apply." },
  { q: "What payment methods are accepted?",  a: "We accept all major credit cards (Visa, Mastercard, Amex), GCash, and PayMaya for Philippine users." },
  { q: "Does the free trial require a card?", a: "No card needed to start your 7-day free trial. You'll only be charged after the trial ends if you choose to continue." },
  { q: "Can I switch plans?",                 a: "Absolutely. Upgrade or downgrade anytime — we'll prorate the difference automatically." },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-12 lg:py-20">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="bg-white/10 text-emerald-600 border-emerald-200 mb-4">Simple Pricing</Badge>
            <h1 className="text-4xl sm:text-5xl font-black mb-4">
              Study smarter.<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-zinc-500 to-teal-500 bg-clip-text text-transparent">Pay less than a coffee.</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Start free. Upgrade when you're ready. Every plan includes access to PrepZap's core study tools.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-3 bg-muted rounded-none p-1">
                <button onClick={() => setAnnual(false)}
                  className={cn("px-4 py-2 rounded-none text-sm font-medium transition-all",
                    !annual ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  Monthly
                </button>
                <button onClick={() => setAnnual(true)}
                  className={cn("px-4 py-2 rounded-none text-sm font-medium transition-all flex items-center gap-2",
                    annual ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  Annual
                  <Badge className="bg-white text-white text-[10px] py-0 px-1.5">Save 20%</Badge>
                </button>
              </div>
              {annual && (
                <p className="text-xs text-muted-foreground">Annual plans save you up to $36/year</p>
              )}
            </div>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map(plan => {
              const price = annual ? plan.annual : plan.monthly
              return (
                <Card key={plan.id} className={cn("relative border-2 transition-all", plan.color)}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className={cn("text-xs px-3 py-0.5",
                        plan.id === "pro" ? "bg-white text-white" : "bg-white/500 text-white")}>
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-4xl mb-2">{plan.icon}</div>
                      <h2 className="text-xl font-black">{plan.name}</h2>
                      <div className="mt-3">
                        {price === 0 ? (
                          <div className="text-4xl font-black">Free</div>
                        ) : (
                          <div>
                            <span className="text-4xl font-black">${price}</span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </div>
                        )}
                        {annual && price > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Billed ${(price * 12).toFixed(0)}/year
                          </p>
                        )}
                      </div>
                    </div>

                    <Link to="/signup">
                      <Button className={cn("w-full mb-6", plan.ctaStyle)}>
                        {plan.cta}
                      </Button>
                    </Link>

                    <div className="space-y-2.5">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm">
                          {f.included
                            ? <Check className="h-4 w-4 text-white/60 shrink-0" />
                            : <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                          <span className={f.included ? "" : "text-muted-foreground/50"}>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Credit info note */}
          <div className="flex items-center justify-center gap-2 mb-16 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>1 credit = 1 AI response (question set, flashcard batch, tutor reply, etc.)</span>
          </div>

          {/* Credit Top-Up Section */}
          <div className="mb-16">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black mb-1">Need more credits?</h2>
              <p className="text-sm text-muted-foreground">One-time top-ups — no subscription required</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {topUpCards.map(card => (
                <Card key={card.credits} className={cn("relative border transition-all hover:-translate-y-0.5", card.best ? "border-emerald-500 shadow-emerald-500/20 shadow-lg" : "border-border")}>
                  {card.best && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white text-[10px] px-2.5 py-0.5">Best Value</Badge>
                    </div>
                  )}
                  <CardContent className="p-5 text-center">
                    <div className="text-2xl mb-1">
                      <Zap className="h-6 w-6 mx-auto text-amber-400" />
                    </div>
                    <p className="font-black text-lg">{card.credits}</p>
                    <p className="text-2xl font-black my-1">{card.price}</p>
                    <p className="text-xs text-muted-foreground mb-4">{card.tag}</p>
                    <Link to="/signup">
                      <Button size="sm" className={cn("w-full", card.best ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "")}>
                        Buy Credits
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
            {[
              { icon: "🔒", label: "Secure payments",  sub: "Powered by Stripe"          },
              { icon: "🔄", label: "Cancel anytime",    sub: "No lock-in contracts"       },
              { icon: "🎓", label: "Student discount",  sub: "30% off with .edu email"    },
              { icon: "💬", label: "24/7 support",      sub: "Fast response, real humans" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="text-center p-4 rounded-none bg-muted/50">
                <div className="text-3xl mb-2">{icon}</div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Feature comparison table */}
          <div className="mb-16">
            <h2 className="text-2xl font-black text-center mb-8">Full Comparison</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Feature</th>
                      {plans.map(p => (
                        <th key={p.id} className="text-center p-4 text-sm font-bold">
                          {p.icon} {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["AI Credits",                      "50/mo",   "500/mo",   "Unlimited" ],
                      ["Practice Questions",              "Limited", "Unlimited","Unlimited" ],
                      ["Flashcard Decks",                 "3",       "Unlimited","Unlimited" ],
                      ["Math Solver",                     "5/day",   "Unlimited","Unlimited" ],
                      ["Feynman Mode",                    false,     true,       true        ],
                      ["AI Tutor",                        false,     true,       true        ],
                      ["File Upload & Sync",              false,     true,       true        ],
                      ["Synthesis Lab",                   false,     true,       true        ],
                      ["Roadmap Generator",               false,     false,      true        ],
                      ["Source Library (NotebookLM)",     false,     true,       true        ],
                      ["Analytics Export",                false,     true,       true        ],
                      ["Priority Support",                false,     false,      true        ],
                    ].map(([feature, ...vals], i) => (
                      <tr key={i} className={cn("border-b last:border-b-0", i % 2 === 0 ? "bg-muted/20" : "")}>
                        <td className="p-4 text-sm font-medium">{feature}</td>
                        {vals.map((v, j) => (
                          <td key={j} className="p-4 text-center">
                            {v === true  ? <Check className="h-4 w-4 text-white/60 mx-auto" /> :
                             v === false ? <X className="h-4 w-4 text-muted-foreground/30 mx-auto" /> :
                             <span className="text-sm font-medium">{v}</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl font-black text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <Card key={i} className="overflow-hidden">
                  <button className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span className="font-semibold text-sm pr-4">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t pt-3">
                      {faq.a}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center bg-gradient-to-br from-zinc-500/10 to-teal-500/5 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-10">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-3xl font-black mb-3">Ready to study smarter?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Join thousands of students already using PrepZap to ace their exams.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/signup">
                <Button size="lg" className="bg-white hover:bg-white/80 text-white px-8">Start for Free</Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="px-8">See Dashboard →</Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">No credit card required · Cancel anytime · 7-day free trial on paid plans</p>
          </div>
        </div>
      </main>
    </div>
  )
}
