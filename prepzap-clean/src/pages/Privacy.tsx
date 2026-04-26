import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const mono: React.CSSProperties = {
  fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', Calibri, sans-serif",
};

const section = (title: string, content: React.ReactNode) => (
  <div style={{ marginBottom: "40px" }}>
    <h2 style={{
      fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em",
      textTransform: "uppercase", color: "var(--pz-text)", marginBottom: "12px",
      ...mono,
    }}>{title}</h2>
    <div style={{ fontSize: "13px", color: "var(--pz-text-2)", lineHeight: 1.8, fontWeight: 300 }}>
      {content}
    </div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg)", color: "var(--pz-text)" }}>

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "0.5px solid var(--pz-border)",
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
        <div style={{
          maxWidth: "720px", margin: "0 auto",
          padding: "0 32px", height: "52px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Link to="/" style={{ textDecoration: "none" }}><Logo /></Link>
          <Link to="/login" style={{
            ...mono, fontSize: "11px", color: "var(--pz-text-muted)",
            textDecoration: "none", letterSpacing: "0.06em",
          }}>Back to login</Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 32px" }}>

        <div style={{ marginBottom: "48px" }}>
          <h1 style={{
            fontSize: "28px", fontWeight: 300, letterSpacing: "-0.02em",
            color: "var(--pz-text)", marginBottom: "8px",
          }}>Privacy Policy</h1>
          <p style={{ ...mono, fontSize: "11px", color: "var(--pz-text-muted)", letterSpacing: "0.06em" }}>
            STUDENIUS · Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div style={{ borderTop: "0.5px solid var(--pz-border)", paddingTop: "40px" }}>

          {section("Overview", (
            <p>
              Studenius ("we", "our", or "us") is an AI-powered learning platform built to help students
              study more effectively. This Privacy Policy explains what information we collect, how we use
              it, and what rights you have over your data. By using Studenius, you agree to the practices
              described in this policy.
            </p>
          ))}

          {section("Information We Collect", (
            <>
              <p style={{ marginBottom: "12px" }}>We collect the following types of information:</p>
              <p style={{ marginBottom: "8px" }}>
                <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>Account information.</strong>{" "}
                When you sign up, we collect your name and email address. If you sign in with Google,
                we receive your name, email address, and profile picture from Google OAuth.
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>Study preferences.</strong>{" "}
                During onboarding, we collect optional information such as your subjects of study and
                daily study goal. This is used to personalize your experience.
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>Usage data.</strong>{" "}
                We collect data about how you use the app, including study sessions, XP earned, streak
                history, questions answered, and features accessed. This is used to track your progress
                and improve the product.
              </p>
              <p>
                <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>Content you create.</strong>{" "}
                Any flashcards, notes, tasks, or study materials you create within the app are stored
                to provide the service.
              </p>
            </>
          ))}

          {section("How We Use Your Information", (
            <>
              <p style={{ marginBottom: "8px" }}>We use the information we collect to:</p>
              <p style={{ marginBottom: "6px" }}>- Provide and operate the Studenius platform</p>
              <p style={{ marginBottom: "6px" }}>- Personalize your study experience and track your progress</p>
              <p style={{ marginBottom: "6px" }}>- Power AI features such as question generation, tutoring, and feedback</p>
              <p style={{ marginBottom: "6px" }}>- Send important account notifications (not marketing emails without consent)</p>
              <p style={{ marginBottom: "6px" }}>- Improve the product through aggregated, anonymized usage analysis</p>
              <p>- Comply with legal obligations</p>
            </>
          ))}

          {section("Google OAuth and Third-Party Sign-In", (
            <p>
              If you choose to sign in with Google, we only access the basic profile information
              that Google provides: your name, email address, and profile picture. We do not access
              your Google Drive, Gmail, contacts, or any other Google services. Your Google account
              credentials are never stored by Studenius. Authentication is handled securely through
              Supabase.
            </p>
          ))}

          {section("Data Storage and Security", (
            <p>
              Your data is stored using Supabase, a secure backend platform. We implement
              industry-standard security practices including encrypted connections (HTTPS),
              row-level security policies, and access controls. While we take reasonable steps to
              protect your data, no system is completely immune to security risks.
            </p>
          ))}

          {section("Data Sharing", (
            <>
              <p style={{ marginBottom: "12px" }}>
                We do not sell your personal data. We do not share your personal information with
                third parties except in the following limited cases:
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>Service providers.</strong>{" "}
                We use trusted third-party services to operate Studenius, including Supabase (database
                and authentication) and AI model providers for study features. These providers only
                access data necessary to provide their services and are bound by confidentiality obligations.
              </p>
              <p>
                <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>Legal requirements.</strong>{" "}
                We may disclose your information if required to do so by law or in response to valid
                legal processes.
              </p>
            </>
          ))}

          {section("Your Rights", (
            <>
              <p style={{ marginBottom: "12px" }}>You have the right to:</p>
              <p style={{ marginBottom: "6px" }}>- Access the personal data we hold about you</p>
              <p style={{ marginBottom: "6px" }}>- Request correction of inaccurate data</p>
              <p style={{ marginBottom: "6px" }}>- Request deletion of your account and associated data</p>
              <p style={{ marginBottom: "6px" }}>- Withdraw consent at any time by deleting your account</p>
              <p style={{ marginBottom: "12px" }}>- Export your data upon request</p>
              <p>
                To exercise any of these rights, contact us at the email address below.
              </p>
            </>
          ))}

          {section("Data Retention", (
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where retention is required
              by law or for legitimate business purposes such as fraud prevention.
            </p>
          ))}

          {section("Children's Privacy", (
            <p>
              Studenius is not directed at children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe a child has provided us with
              their information, please contact us and we will promptly delete it.
            </p>
          ))}

          {section("Changes to This Policy", (
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              date at the top of this page. Continued use of Studenius after any changes means you
              accept the updated policy.
            </p>
          ))}

          {section("Contact", (
            <p>
              If you have any questions about this Privacy Policy or how your data is handled,
              you can reach us at:{" "}
              <a
                href="mailto:support@studenius.com"
                style={{ color: "var(--pz-text-2)", textDecoration: "none", borderBottom: "0.5px solid var(--pz-border)" }}>
                support@studenius.com
              </a>
            </p>
          ))}

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "0.5px solid var(--pz-border)" }}>
        <div style={{
          maxWidth: "720px", margin: "0 auto", padding: "20px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.06em" }}>
            STUDENIUS © {new Date().getFullYear()}
          </span>
          <Link to="/" style={{ fontSize: "11px", color: "var(--pz-text-muted)", textDecoration: "none" }}>
            Back to home
          </Link>
        </div>
      </footer>

    </div>
  );
}
