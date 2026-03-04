import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="flex flex-col items-center gap-8 p-12 rounded-3xl"
        style={{
          background:   "var(--bg-elevated)",
          border:       "1px solid var(--border-subtle)",
          boxShadow:    "var(--shadow-elevated)",
          minWidth:     "360px",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--accent-primary)",
              boxShadow:  "0 4px 24px var(--accent-glow-strong)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ stroke: "var(--text-on-accent)" }}>
              <path d="M12 2C8 2 5 5.5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.5-3-7-7-7z"
                fill="var(--text-on-accent)" fillOpacity="0.25" />
              <circle cx="12" cy="9.5" r="2.5" fill="var(--text-on-accent)" stroke="none" />
            </svg>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{
              fontFamily: "'DM Serif Display', serif",
              color: "var(--text-primary)",
            }}>PosturePlus</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              AI-powered posture monitoring
            </p>
          </div>
        </div>

        <div className="w-full h-px" style={{ background: "var(--border-subtle)" }} />

        {/* Google Sign In */}
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Sign in to save your sessions
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "var(--bg-primary)",
              border:     "1px solid var(--border-medium)",
              color:      "var(--text-primary)",
              boxShadow:  "var(--shadow-card)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
              (e.currentTarget as HTMLElement).style.boxShadow  = "0 0 0 1px var(--accent-primary), var(--shadow-card)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-medium)";
              (e.currentTarget as HTMLElement).style.boxShadow  = "var(--shadow-card)";
            }}
          >
            {/* Google SVG logo */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}