import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu, ChevronDown, BookOpen, Brain, Clock, BarChart3,
  MessageSquare, Calendar, Sparkles, Mic, Settings, LogOut,
  Wrench, Layers, HelpCircle, Upload, Zap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "/pro",     label: "Pricing"     },
  { href: "/suggestions", label: "Suggestions" },
];

const studyTools = [
  // AI & Tutoring
  { href: "/ai-tutor",       label: "BrainBot",       icon: MessageSquare, description: "Ask anything, anytime",              pro: true  },
  { href: "/feynman",        label: "Feynman",         icon: Mic,           description: "Teach it to learn it",              pro: true  },
  { href: "/math",           label: "MathZap",         icon: Sparkles,      description: "Step-by-step solutions"                        },
  // Practice & Quizzing
  { href: "/practice",       label: "Practice",        icon: BookOpen,      description: "AI question sets"                              },
  { href: "/flashcards",     label: "Flashcards",      icon: Layers,        description: "Spaced repetition learning"                    },
  { href: "/daily5",         label: "Daily Quiz",      icon: Zap,           description: "Quick daily rounds"                            },
  { href: "/spot-error",     label: "Error Hunt",      icon: HelpCircle,    description: "Find & fix mistakes"                           },
  // Deep Learning
  { href: "/blank-map",      label: "Mind Map",        icon: Layers,        description: "Map & connect ideas"                           },
  { href: "/build-def",      label: "Concepts",        icon: HelpCircle,    description: "Build definitions from memory"                 },
  { href: "/tool-architect", label: "Roadmap",         icon: Wrench,        description: "Zero to mastery on any topic"                  },
  // Focus & Tracking
  { href: "/timer",          label: "Pomodoro",        icon: Clock,         description: "Focus timer with ambient sounds"               },
  { href: "/analytics",      label: "Progress",        icon: BarChart3,     description: "Track your performance"                        },
  { href: "/planner",        label: "Planner",         icon: Calendar,      description: "Plan your study week"                          },
  // Files
  { href: "/sources",        label: "Sources",         icon: Upload,        description: "Your study files"                              },
  { href: "/upload",         label: "Upload",          icon: Upload,        description: "Add PDFs and notes"                            },
];

const navStyle: React.CSSProperties = {
  fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', Calibri, sans-serif",
  fontWeight: 300,
  fontSize: "12px",
  color: "var(--pz-text-2)",
  textDecoration: "none",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  transition: "color 0.15s",
};

interface NavbarProps {
  isLoggedIn?: boolean;
  user?: { name: string; xp?: number; streak?: number; plan?: "free" | "pro" };
  extraRight?: React.ReactNode;
}

export function Navbar({ isLoggedIn = false, user, extraRight }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "0.5px solid var(--pz-border)",
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "52px",
        padding: "0 32px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <Logo />
        </Link>

        {/* Center nav - hidden on mobile */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }} className="hidden md:flex">
          {isLoggedIn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button style={{ ...navStyle, display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--pz-text)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--pz-text-2)")}>
                  Study Tools <ChevronDown style={{ width: 12, height: 12 }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" style={{ background: "var(--pz-surface)", border: "0.5px solid var(--pz-border)", borderRadius: "var(--pz-r-lg)", width: "260px", maxHeight: "70vh", overflowY: "auto" }}>
                {studyTools.map((tool) => (
                  <DropdownMenuItem key={tool.href} asChild>
                    <Link to={tool.href} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", textDecoration: "none", color: "var(--pz-text-2)" }}>
                      <tool.icon style={{ width: 13, height: 13, marginTop: 2, flexShrink: 0, color: "var(--pz-text-muted)" }} />
                      <div>
                        <div style={{ fontSize: "12px", color: "var(--pz-text)", fontWeight: 400, display: "flex", alignItems: "center", gap: "6px" }}>
                          {tool.label}
                          {tool.pro && <span style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(255,255,255,0.06)", color: "var(--pz-text-muted)", border: "0.5px solid var(--pz-border)", letterSpacing: "0.06em" }}>PRO</span>}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--pz-text-muted)", marginTop: "1px" }}>{tool.description}</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {navLinks.map((link) => (
            <Link key={link.href} to={link.href}
              style={{ ...navStyle, color: location.pathname === link.href ? "var(--pz-text)" : "var(--pz-text-2)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--pz-text)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = location.pathname === link.href ? "var(--pz-text)" : "var(--pz-text-2)")}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isLoggedIn ? (
            <>
              {/* Global Source Context Bar - hidden on mobile */}
              <div className="hidden md:flex">
                <GlobalContextBar compact />
              </div>
              {extraRight}

              {/* XP/streak - hidden on mobile */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginRight: "4px" }} className="hidden md:flex">
                {user?.streak && user.streak > 0 && (
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "var(--pz-text-muted)" }}>
                    {user.streak}d
                  </span>
                )}
                {user?.xp && (
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "11px", color: "var(--pz-text-muted)" }}>
                    {user.xp.toLocaleString()} XP
                  </span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    width: "28px", height: "28px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "0.5px solid var(--pz-border)",
                    background: "transparent",
                    color: "var(--pz-text)",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                    borderRadius: "50%",
                  }}>
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ background: "var(--pz-surface)", border: "0.5px solid var(--pz-border)", borderRadius: "var(--pz-r-lg)", width: "200px" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--pz-border)" }}>
                    <span style={{ fontSize: "12px", color: "var(--pz-text)", fontWeight: 400 }}>{user?.name || "User"}</span>
                    {user?.plan && <span style={{ marginLeft: "8px", fontSize: "9px", padding: "1px 5px", background: "rgba(255,255,255,0.06)", color: "var(--pz-text-muted)", border: "0.5px solid var(--pz-border)" }}>{user.plan === "pro" ? "PRO" : "FREE"}</span>}
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", textDecoration: "none", fontSize: "12px", color: "var(--pz-text-2)" }}>
                      <BarChart3 style={{ width: 13, height: 13 }} /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", textDecoration: "none", fontSize: "12px", color: "var(--pz-text-2)" }}>
                      <Settings style={{ width: 13, height: 13 }} /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: "var(--pz-border)" }} />
                  <DropdownMenuItem onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", fontSize: "12px", color: "var(--pz-text-muted)", cursor: "pointer" }}>
                    <LogOut style={{ width: 13, height: 13 }} /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden md:flex" style={{ gap: "12px", alignItems: "center" }}>
              <Link to="/login">
                <button style={{
                  fontFamily: "'Geist', sans-serif", fontWeight: 300,
                  fontSize: "12px", color: "var(--pz-text-2)",
                  background: "transparent", border: "0.5px solid var(--pz-border)",
                  padding: "6px 14px", cursor: "pointer", letterSpacing: "0.02em",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                  onMouseEnter={e => { (e.currentTarget).style.color = "var(--pz-text)"; (e.currentTarget).style.borderColor = "var(--pz-border-hv)"; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = "var(--pz-text-2)"; (e.currentTarget).style.borderColor = "var(--pz-border)"; }}>
                  Sign in
                </button>
              </Link>
              <Link to="/signup">
                <button style={{
                  fontFamily: "'Geist', sans-serif", fontWeight: 400,
                  fontSize: "12px", color: "#000",
                  background: "var(--pz-text)", border: "none",
                  padding: "6px 16px", cursor: "pointer", letterSpacing: "0.03em",
                  transition: "opacity 0.15s",
                }}
                  onMouseEnter={e => ((e.currentTarget).style.opacity = "0.82")}
                  onMouseLeave={e => ((e.currentTarget).style.opacity = "1")}>
                  Get Started
                </button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden" style={{
                width: "32px", height: "32px", display: "flex",
                alignItems: "center", justifyContent: "center",
                border: "0.5px solid var(--pz-border)", background: "transparent",
                color: "var(--pz-text-2)", cursor: "pointer",
              }}>
                <Menu style={{ width: 14, height: 14 }} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" style={{ background: "var(--pz-surface)", border: "none", borderLeft: "0.5px solid var(--pz-border)", width: "280px", padding: "32px 24px", borderRadius: 0 }}>
              <div style={{ marginBottom: "24px" }}><Logo /></div>
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)}
                  style={{ display: "block", padding: "10px 0", borderBottom: "0.5px solid var(--pz-border)", fontSize: "12px", color: "var(--pz-text-2)", textDecoration: "none" }}>
                  {link.label}
                </Link>
              ))}
              {!isLoggedIn && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "24px" }}>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <button style={{ width: "100%", padding: "10px", fontSize: "12px", fontFamily: "'Geist', sans-serif", border: "0.5px solid var(--pz-border)", background: "transparent", color: "var(--pz-text-2)", cursor: "pointer" }}>
                      Sign In
                    </button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)}>
                    <button style={{ width: "100%", padding: "10px", fontSize: "12px", fontFamily: "'Geist', sans-serif", fontWeight: 400, background: "var(--pz-text)", color: "#000", border: "none", cursor: "pointer" }}>
                      Get Started Free
                    </button>
                  </Link>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}


