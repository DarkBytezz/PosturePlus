import type { ReactNode } from "react";
import { useTheme } from "../lib/useTheme";
import { usePosture } from "../context/PostureContext";
import { useAuth } from "../hooks/useAuth";

interface Props {
  isGuest?: boolean;
  onExitGuest?: () => void;
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const navItems = [
  {
    label: "Dashboard",
    key: "dashboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    ),
  },
  {
    label: "Monitor",
    key: "monitor",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="3" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="21" />
        <line x1="3" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    label: "Reports",
    key: "reports",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "Settings",
    key: "settings",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function AppLayout({ children, activeTab = "dashboard", onTabChange, isGuest = false, onExitGuest }: Props) {
  const { theme, setTheme } = useTheme();
  const { psi, zone, isCalibrated } = usePosture();
  const { user, signOut } = useAuth();
  const collapsed = false;

  const userName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Guest";
  const userEmail = user?.email ?? "guest mode";
  const userAvatar = user?.user_metadata?.avatar_url ?? null;

  return (
    <div
      className="min-h-screen flex transition-colors duration-500"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? "4.5rem" : "15rem",
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          boxShadow: "var(--shadow-card)",
        }}
        className="overflow-hidden transition-all duration-300 ease-in-out flex flex-col shrink-0 relative z-20"
      >
        {/* Subtle grain on sidebar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            opacity: 0.035,
          }}
        />

        {/* Logo Area */}
        <div
          style={{ borderBottom: "1px solid var(--border-subtle)", height: "4.5rem" }}
          className={`flex items-center shrink-0 px-4 gap-3 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center">
            <img src="/logo.png" alt="Posture+" className="w-full h-full object-contain" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden">
              <p
                className="font-semibold text-[18px] whitespace-nowrap leading-none"
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  letterSpacing: "0.3px"
                }}
              >
                Posture+
              </p>
              <p className="text-[10px] tracking-widest uppercase whitespace-nowrap" style={{ color: "var(--text-faint)" }}>
                AI POSTURE MONITORING
              </p>
            </div>
          )}
        </div>

        {/* Nav Section */}
        <nav className="flex flex-col p-3 gap-0.5 flex-1 mt-2">
          {!collapsed && (
            <p
              className="text-[9px] font-semibold tracking-[0.18em] uppercase px-3 mb-3"
              style={{ color: "var(--text-faint)" }}
            >
              Navigation
            </p>
          )}

          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange?.(item.key)}
                className={`group relative flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all duration-200 ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"
                  }`}
                style={{
                  background: isActive ? "var(--accent-primary)" : "transparent",
                  color: isActive ? "var(--text-on-accent)" : "var(--text-muted)",
                  boxShadow: isActive ? "0 2px 12px var(--accent-glow-strong)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "var(--accent-glow)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  }
                }}
              >
                {/* Active left bar */}
                {isActive && !collapsed && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{ background: "var(--text-on-accent)", opacity: 0.5 }}
                  />
                )}

                <span className="shrink-0">{item.icon}</span>

                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span
                    className="absolute left-full ml-3 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                      boxShadow: "var(--shadow-elevated)",
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Status Dot */}
        {!collapsed && (
          <div
            className="mx-3 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
            style={{ background: "var(--accent-glow)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full animate-blink" style={{ background: "var(--status-green)" }} />
              <span className="absolute w-4 h-4 rounded-full opacity-20 animate-pulse-ring" style={{ background: "var(--status-green)" }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-primary)" }}>Live Tracking</p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Active session</p>
            </div>
          </div>
        )}

        {/* User footer */}
        <div
          style={{ borderTop: "1px solid var(--border-subtle)" }}
          className={`p-3 ${collapsed ? "flex justify-center" : ""}`}
        >
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl ${collapsed ? "" : "w-full"}`}>
            {userAvatar ? (
              <img src={userAvatar} alt={userName}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
                style={{ border: "1px solid var(--accent-primary)" }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: "var(--accent-glow-strong)",
                  color: "var(--accent-primary-bright)",
                  border: "1px solid var(--accent-primary)",
                }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{userEmail}</p>
              </div>
            )}
            {!collapsed && user && (
              <button onClick={signOut} title="Sign out"
                className="shrink-0 p-1.5 rounded-lg transition-all duration-150"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent-danger)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          style={{
            height: "4.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
          className="flex items-center justify-between px-8 shrink-0"
        >
          <div />

          <div className="flex items-center gap-3">
            {/* PSI quick badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: "var(--accent-glow)",
                color: !isCalibrated ? "var(--text-muted)"
                  : zone === "GREEN" ? "var(--accent-primary)"
                    : zone === "YELLOW" ? "var(--accent-gold-bright)"
                      : "var(--accent-danger)",
                border: "1px solid var(--border-medium)",
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isCalibrated ? "animate-blink" : ""}`}
                style={{
                  background: !isCalibrated ? "var(--text-faint)"
                    : zone === "GREEN" ? "#4ade80"
                      : zone === "YELLOW" ? "var(--accent-gold-bright)"
                        : "var(--accent-danger)"
                }}
              />
              {isCalibrated ? `PSI: ${Math.round(psi)}` : "PSI: --"}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-medium)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
              }}
            >
              {theme === "dark" ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  Light
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Dark
                </>
              )}
            </button>
          </div>
        </header>

        {isGuest && (
          <div style={{
            background: "linear-gradient(90deg, #B07D3A, #8B6520)",
            color: "white", padding: "0.5rem 2rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: "0.78rem",
          }}>
            <span>👤 Guest mode — data is temporary and will vanish on reload.</span>
            <button onClick={onExitGuest} style={{
              background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
              color: "white", borderRadius: "100px", padding: "0.25rem 0.9rem",
              fontSize: "0.75rem", cursor: "pointer",
            }}>Sign in to save →</button>
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}