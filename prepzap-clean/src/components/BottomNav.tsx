import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { LayoutDashboard, BookOpen, Zap, BarChart3, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/practice",  label: "Practice", icon: BookOpen },
  { href: "/daily5",    label: "Daily",    icon: Zap },
  { href: "/analytics", label: "Progress", icon: BarChart3 },
  { href: "/settings",  label: "Settings", icon: Settings },
];

export function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(0,0,0,0.95)",
        borderTop: "0.5px solid var(--pz-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              style={{ textDecoration: "none" }}
            >
              <Icon
                style={{
                  width: 20,
                  height: 20,
                  color: active ? "var(--pz-gold)" : "var(--pz-text-muted)",
                  transition: "color 0.15s",
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.05em",
                  color: active ? "var(--pz-gold)" : "var(--pz-text-muted)",
                  fontFamily: "'Geist', sans-serif",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
