import { Link } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F0E8D4", fontFamily: "'Geist', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>

        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(240,232,212,0.4)", fontSize: 13, marginBottom: 40, textDecoration: "none" }}>
          <ChevronLeft size={14} /> Back to PrepZap
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: "-0.02em", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "rgba(240,232,212,0.4)", fontSize: 13, marginBottom: 48 }}>Last updated: April 2026</p>

        {[
          {
            title: "1. Acceptance of Terms",
            content: `By accessing or using PrepZap, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use PrepZap. We reserve the right to update these terms at any time, and continued use of the service constitutes acceptance of any changes.`
          },
          {
            title: "2. Description of Service",
            content: `PrepZap is an AI-powered study platform that provides tools including flashcards, practice questions, AI tutoring, focus timers, and study planning. Some features are available for free while others require a paid subscription. We reserve the right to modify, suspend, or discontinue any part of the service at any time.`
          },
          {
            title: "3. User Accounts",
            content: `You must create an account to use PrepZap. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account. You may not share your account with others or create multiple accounts.`
          },
          {
            title: "4. Acceptable Use",
            content: `You agree to use PrepZap only for lawful educational purposes. You may not use the service to violate any laws, infringe on intellectual property rights, distribute harmful or offensive content, attempt to gain unauthorized access to our systems, or interfere with other users' access to the service.`
          },
          {
            title: "5. AI-Generated Content",
            content: `PrepZap uses artificial intelligence to generate study content, explanations, and practice questions. While we strive for accuracy, AI-generated content may contain errors. You should not rely solely on AI-generated content for critical academic decisions. PrepZap is a study aid and does not replace professional educational guidance.`
          },
          {
            title: "6. User Content",
            content: `You retain ownership of any study materials you upload to PrepZap. By uploading content, you grant us a limited license to process and display that content solely to provide our services to you. You are responsible for ensuring you have the right to upload any materials and that doing so does not violate copyright or other laws.`
          },
          {
            title: "7. Subscription and Payments",
            content: `PrepZap offers free and paid subscription tiers. Paid subscriptions are billed on a monthly or annual basis. All payments are processed securely. Subscriptions automatically renew unless cancelled before the renewal date. Refunds are handled on a case-by-case basis — contact us at prepzaps@gmail.com for refund requests.`
          },
          {
            title: "8. Intellectual Property",
            content: `PrepZap and its original content, features, and functionality are owned by PrepZap and are protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on PrepZap without our explicit written permission.`
          },
          {
            title: "9. Limitation of Liability",
            content: `PrepZap is provided on an "as is" basis without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability to you shall not exceed the amount you paid for the service in the past 12 months.`
          },
          {
            title: "10. Termination",
            content: `We reserve the right to suspend or terminate your account if you violate these terms. You may also delete your account at any time. Upon termination, your right to use PrepZap ceases immediately. Provisions that by their nature should survive termination will remain in effect.`
          },
          {
            title: "11. Contact Us",
            content: `If you have any questions about these Terms of Service, please contact us at prepzaps@gmail.com.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#F0E8D4" }}>{section.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(240,232,212,0.6)", fontWeight: 300 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "0.5px solid rgba(240,232,212,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(240,232,212,0.3)" }}>PrepZap · All rights reserved</span>
          <Link to="/privacy" style={{ fontSize: 12, color: "rgba(240,232,212,0.4)", textDecoration: "none" }}>Privacy Policy →</Link>
        </div>
      </div>
    </div>
  )
}
