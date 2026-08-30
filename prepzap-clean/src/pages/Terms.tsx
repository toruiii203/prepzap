import { Link } from "react-router-dom"

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: "By creating an account, downloading our mobile application, or accessing Studenius (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. We may update these terms periodically, and your continued use of Studenius after updates constitutes acceptance of the modified terms."
  },
  {
    title: "2. Eligibility and Account Security",
    content: "You must be at least 13 years of age to use Studenius. When signing up with Google OAuth or email, you agree to provide accurate and complete information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. Notify us immediately at studeniusapp@gmail.com if you suspect unauthorized access."
  },
  {
    title: "3. Educational Services & AI Tools",
    content: "Studenius provides automated study tools including AI Practice Quizzes, Flashcards with Spaced Repetition (SM-2), AI Tutor explanations, Focus Timers, and multiplayer Arena Challenges. While our AI models strive to generate accurate and high-yield learning content, AI-generated questions and explanations may occasionally contain inaccuracies. Studenius is intended as a supplementary study tool and is not a substitute for accredited educational instruction or official curriculum materials."
  },
  {
    title: "4. User Content & Intellectual Property",
    content: "You retain full ownership of any notes, PDFs, or study sources you upload to the Source Library. By uploading content, you grant Studenius a limited, non-exclusive license to process, parse, and extract text strictly for generating your personalized study materials. You represent that you have the right to upload your materials and that doing so does not infringe upon third-party copyrights."
  },
  {
    title: "5. Subscriptions, Payments & Refunds (Studenius Pro)",
    content: "Studenius offers a Free tier with daily generation credits, as well as a paid Studenius Pro subscription offering unlimited AI questions, mistake analysis, and advanced modes. Paid subscriptions are billed on a recurring monthly or annual basis through authorized payment gateways (including PayMongo, GCash, Maya, cards, and PayPal). You may cancel your subscription at any time via Settings or by contacting support. Refund requests are reviewed on a case-by-case basis within 7 days of purchase by contacting studeniusapp@gmail.com."
  },
  {
    title: "6. Acceptable Use & Academic Honesty",
    content: "You agree to use Studenius solely for lawful learning purposes. You may not attempt to reverse engineer, scrape, bypass rate limits, overload our AI infrastructure, or use the service to commit academic fraud or test integrity violations. We reserve the right to suspend or terminate accounts that engage in abusive or harmful activity."
  },
  {
    title: "7. Multiplayer & Arena Conduct",
    content: "When participating in Arena Quiz Rooms or the Global XP League, you agree to engage in fair play. The use of automated scripts, answer scrapers, or abusive display names is strictly prohibited and will result in immediate disqualification and account suspension."
  },
  {
    title: "8. Limitation of Liability",
    content: "Studenius is provided on an \"as is\" and \"as available\" basis without warranties of any kind, whether express or implied. In no event shall Studenius, its creators, or affiliates be liable for any indirect, incidental, or consequential damages resulting from your use of the platform, exam outcomes, or reliance on AI-generated study content."
  },
  {
    title: "9. Account Deletion & Termination",
    content: "You may delete your account and all associated study progress at any time via the Settings page or by emailing studeniusapp@gmail.com. Upon deletion, your personal data and study records will be permanently removed from our active database within 30 days."
  },
  {
    title: "10. Contact Us",
    content: "If you have any questions, feedback, or legal inquiries regarding these Terms of Service, please reach out directly to our team at studeniusapp@gmail.com."
  }
]

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A1A] font-sans antialiased selection:bg-[#ae2925] selection:text-white">
      {/* Top Header */}
      <header className="border-b-2 border-black bg-white px-4 py-4 sticky top-0 z-30 shadow-[0_2px_0_0_#000]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 font-black text-[13px] uppercase tracking-wider text-black bg-[#FAF7F2] hover:bg-black hover:text-white px-3 py-1.5 border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-black tracking-tight text-[17px]">Studenius</span>
            <span className="text-[10px] font-black uppercase bg-[#ae2925] text-white px-2 py-0.5 rounded border border-black">
              Legal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 py-10 pb-24">
        {/* Title Banner */}
        <div className="border-2 border-black bg-white p-6 sm:p-8 rounded-lg shadow-[4px_4px_0px_0px_#000] mb-8">
          <div className="inline-flex items-center gap-1.5 bg-[#FAF7F2] border-2 border-black px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider text-[#ae2925] mb-4 shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[14px]">gavel</span>
            Official Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Terms of Service</h1>
          <p className="text-[13px] font-bold text-black/60">
            Last modified: August 2026 • Please read these terms carefully before using Studenius.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-5">
          {SECTIONS.map((sec) => (
            <div
              key={sec.title}
              className="border-2 border-black bg-white p-6 rounded-lg shadow-[3px_3px_0px_0px_#000] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#000]"
            >
              <h2 className="text-[16px] sm:text-[17px] font-black mb-3 text-black flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#ae2925] border border-black rounded-full inline-block"></span>
                {sec.title}
              </h2>
              <p className="text-[14px] leading-relaxed font-medium text-black/80">
                {sec.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-6 border-t-2 border-black/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-bold text-black/60">
          <span>© 2026 Studenius. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-black underline underline-offset-2">
              Privacy Policy
            </Link>
            <span>•</span>
            <a href="mailto:studeniusapp@gmail.com" className="hover:text-black underline underline-offset-2">
              studeniusapp@gmail.com
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
