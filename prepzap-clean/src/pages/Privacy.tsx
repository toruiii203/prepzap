import { Link } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F0E8D4", fontFamily: "'Geist', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>

        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(240,232,212,0.4)", fontSize: 13, marginBottom: 40, textDecoration: "none" }}>
          <ChevronLeft size={14} /> Back to PrepZap
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: "-0.02em", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "rgba(240,232,212,0.4)", fontSize: 13, marginBottom: 48 }}>Last updated: April 2026</p>

        {[
          {
            title: "1. Information We Collect",
            content: `When you create an account on PrepZap, we collect your name and email address. If you sign in with Google, we receive your name, email, and profile picture from Google. We also collect usage data such as study sessions, flashcard progress, quiz results, and feature interactions to improve your experience.`
          },
          {
            title: "2. How We Use Your Information",
            content: `We use your information to provide and improve PrepZap's study tools, personalize your learning experience, track your progress and streaks, send important account notifications, and respond to your support requests. We do not sell your personal information to third parties.`
          },
          {
            title: "3. Data Storage",
            content: `Your account data is securely stored using Supabase, a trusted database provider. Study materials you upload are stored locally in your browser and are not transmitted to our servers unless explicitly used with AI features. AI interactions are processed through Groq's API and are not permanently stored.`
          },
          {
            title: "4. Cookies and Local Storage",
            content: `PrepZap uses browser local storage to save your theme preferences, study events, flashcards, and session data. This data stays on your device and is not shared with us unless you are logged in. We do not use tracking cookies or advertising cookies.`
          },
          {
            title: "5. Third-Party Services",
            content: `PrepZap uses the following third-party services: Supabase for authentication and database storage, Groq for AI-powered study features, and Google OAuth for sign-in. Each of these services has their own privacy policy and data handling practices.`
          },
          {
            title: "6. Data Retention",
            content: `We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at prepzaps@gmail.com. Upon deletion, your data will be permanently removed within 30 days.`
          },
          {
            title: "7. Children's Privacy",
            content: `PrepZap is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us immediately.`
          },
          {
            title: "8. Your Rights",
            content: `You have the right to access, correct, or delete your personal data at any time. You may also withdraw consent for data processing, request a copy of your data, or opt out of non-essential communications. To exercise these rights, contact us at prepzaps@gmail.com.`
          },
          {
            title: "9. Changes to This Policy",
            content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the app. Continued use of PrepZap after changes constitutes acceptance of the updated policy.`
          },
          {
            title: "10. Contact Us",
            content: `If you have any questions about this Privacy Policy, please contact us at prepzaps@gmail.com.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#F0E8D4" }}>{section.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(240,232,212,0.6)", fontWeight: 300 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "0.5px solid rgba(240,232,212,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(240,232,212,0.3)" }}>PrepZap · All rights reserved</span>
          <Link to="/terms" style={{ fontSize: 12, color: "rgba(240,232,212,0.4)", textDecoration: "none" }}>Terms of Service →</Link>
        </div>
      </div>
    </div>
  )
}
