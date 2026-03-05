import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type AuthMode = "idle" | "magic" | "sent";

// ── Animated PSI Ring ──────────────────────────────────────────────────────
function AnimatedPSI() {
  const [value, setValue] = useState(72);
  const [rising, setRising] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setValue(v => {
        const next = rising ? v + 0.4 : v - 0.4;
        if (next >= 96) setRising(false);
        if (next <= 58) setRising(true);
        return Math.round(next * 10) / 10;
      });
    }, 60);
    return () => clearInterval(t);
  }, [rising]);

  const radius   = 54;
  const circ     = 2 * Math.PI * radius;
  const progress = (value / 100) * circ;
  const color    = value >= 80 ? "#5C7A3E" : value >= 60 ? "#B07D3A" : "#9B3A2A";
  const label    = value >= 80 ? "EXCELLENT" : value >= 60 ? "MODERATE" : "POOR";

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none"
          stroke="#E8DFD0" strokeWidth="6" />
        <circle cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${progress} ${circ - progress}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "all 0.3s ease", filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem", fontWeight: 700,
          color: "#2C1810", lineHeight: 1,
        }}>{Math.round(value)}</span>
        <span style={{
          fontSize: "0.55rem", letterSpacing: "0.15em",
          color: color, fontWeight: 700, marginTop: 2,
        }}>{label}</span>
      </div>
    </div>
  );
}

// ── Stat Counter ───────────────────────────────────────────────────────────
function StatCounter({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = end / 60;
        const t = setInterval(() => {
          start = Math.min(start + step, end);
          setVal(Math.round(start));
          if (start >= end) clearInterval(t);
        }, 20);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "3.2rem", fontWeight: 700,
        color: "#2C1810", lineHeight: 1,
      }}>
        {val}{suffix}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#7A5C3A", marginTop: "0.4rem", letterSpacing: "0.06em" }}>
        {label}
      </div>
    </div>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────────────
export default function LandingPage({ onGuestEnter }: {
  onGuestEnter: () => void;
}) {
  const [authMode, setAuthMode]   = useState<AuthMode>("idle");
  const [email, setEmail]         = useState("");
  const [sending, setSending]     = useState(false);
  const [showNav, setShowNav]     = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowNav(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleMagicLink() {
    if (!email.trim()) return;
    setSending(true);
    // Supabase magic link — import supabase and call signInWithOtp
    const { supabase } = await import("../lib/supabase");
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    setAuthMode("sent");
  }

  async function handleGoogle() {
    const { supabase } = await import("../lib/supabase");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,900;1,400;1,700&family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body { background: #F5EFE4; }

    .land-root {
      font-family: 'Lora', serif;
      background: #F5EFE4;
      color: #2C1810;
      overflow-x: hidden;
    }

    /* NAV */
    .land-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      padding: 1.2rem 4rem;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.3s ease;
    }
    .land-nav.scrolled {
      background: rgba(245,239,228,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(92,60,30,0.1);
      padding: 0.8rem 4rem;
    }
    .land-nav-logo {
      font-family: 'Playfair Display', serif;
      font-size: 1.4rem; font-weight: 700;
      color: #2C1810; letter-spacing: -0.02em;
    }
    .land-nav-logo span { color: #5C7A3E; }
    .land-nav-cta {
      background: #2C1810;
      color: #F5EFE4;
      border: none; border-radius: 100px;
      padding: 0.6rem 1.6rem;
      font-family: 'Lora', serif;
      font-size: 0.85rem; cursor: pointer;
      transition: all 0.2s;
    }
    .land-nav-cta:hover { background: #5C7A3E; transform: translateY(-1px); }

    /* HERO */
    .land-hero {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      padding: 8rem 6rem 4rem;
      gap: 4rem;
      position: relative;
    }
    .land-hero::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 60% 60% at 80% 50%, rgba(92,122,62,0.08) 0%, transparent 70%),
                  radial-gradient(ellipse 40% 40% at 20% 80%, rgba(176,125,58,0.06) 0%, transparent 60%);
      pointer-events: none;
    }

    .land-eyebrow {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: rgba(92,122,62,0.12);
      border: 1px solid rgba(92,122,62,0.25);
      border-radius: 100px;
      padding: 0.35rem 1rem;
      font-size: 0.72rem; font-weight: 500;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #5C7A3E; margin-bottom: 1.6rem;
    }
    .land-eyebrow-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #5C7A3E;
      animation: blink 2s infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

    .land-h1 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(3rem, 5.5vw, 5.5rem);
      font-weight: 900;
      line-height: 1.0;
      letter-spacing: -0.02em;
      color: #2C1810;
      margin-bottom: 1.6rem;
    }
    .land-h1 em {
      font-style: italic;
      color: #5C7A3E;
    }
    .land-h1 .underline-word {
      position: relative; display: inline-block;
    }
    .land-h1 .underline-word::after {
      content: '';
      position: absolute; bottom: 2px; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #B07D3A, #5C7A3E);
      border-radius: 2px;
    }

    .land-sub {
      font-size: 1.1rem; line-height: 1.7;
      color: #5C3D1E; max-width: 520px;
      margin-bottom: 2.4rem;
    }

    .land-hero-actions {
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    }

    .btn-primary {
      background: #2C1810;
      color: #F5EFE4;
      border: none; border-radius: 100px;
      padding: 0.9rem 2.2rem;
      font-family: 'Lora', serif; font-size: 0.95rem;
      cursor: pointer; transition: all 0.25s;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .btn-primary:hover { background: #5C7A3E; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(92,122,62,0.25); }

    .btn-ghost {
      background: transparent;
      color: #5C3D1E;
      border: 1.5px solid rgba(92,60,30,0.25);
      border-radius: 100px;
      padding: 0.9rem 2rem;
      font-family: 'Lora', serif; font-size: 0.95rem;
      cursor: pointer; transition: all 0.25s;
    }
    .btn-ghost:hover { border-color: #5C7A3E; color: #5C7A3E; }

    /* HERO VISUAL */
    .land-hero-visual {
      display: flex; flex-direction: column;
      align-items: center; gap: 1.5rem;
      position: relative;
    }

    .hero-card {
      background: rgba(255,252,245,0.85);
      border: 1px solid rgba(92,60,30,0.12);
      border-radius: 24px;
      padding: 2rem;
      box-shadow: 0 8px 40px rgba(44,24,16,0.08), 0 2px 8px rgba(44,24,16,0.04);
      backdrop-filter: blur(8px);
      width: 100%; max-width: 380px;
    }

    .hero-zone-bar {
      height: 8px; border-radius: 100px;
      background: linear-gradient(90deg, #5C7A3E 70%, #B07D3A 85%, #9B3A2A 100%);
      margin-bottom: 0.6rem;
      box-shadow: 0 0 12px rgba(92,122,62,0.3);
    }
    .hero-zone-labels {
      display: flex; justify-content: space-between;
      font-size: 0.65rem; letter-spacing: 0.1em;
      color: #7A5C3A; font-family: 'DM Mono', monospace;
    }

    .hero-metrics {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 0.8rem; margin-top: 1.2rem;
    }
    .hero-metric {
      background: rgba(245,239,228,0.6);
      border-radius: 12px; padding: 0.7rem 0.5rem;
      text-align: center;
      border: 1px solid rgba(92,60,30,0.08);
    }
    .hero-metric-val {
      font-family: 'Playfair Display', serif;
      font-size: 1.4rem; font-weight: 700; color: #2C1810;
    }
    .hero-metric-lbl {
      font-size: 0.6rem; color: #7A5C3A;
      letter-spacing: 0.08em; margin-top: 2px;
      font-family: 'DM Mono', monospace;
    }

    /* IEEE BADGE */
    .ieee-badge {
      display: flex; align-items: center; gap: 0.8rem;
      background: rgba(255,252,245,0.9);
      border: 1px solid rgba(176,125,58,0.3);
      border-radius: 16px;
      padding: 1rem 1.4rem;
      width: 100%; max-width: 380px;
      box-shadow: 0 4px 20px rgba(176,125,58,0.1);
    }
    .ieee-icon {
      width: 40px; height: 40px; border-radius: 8px;
      background: linear-gradient(135deg, #1a3a6b, #2b5eb7);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 0.6rem; font-weight: 800; color: white;
      letter-spacing: 0.05em; font-family: 'DM Mono', monospace;
    }
    .ieee-text-title {
      font-size: 0.72rem; font-weight: 600; color: #2C1810;
      line-height: 1.3;
    }
    .ieee-text-sub {
      font-size: 0.65rem; color: #7A5C3A; margin-top: 1px;
    }

    /* DIVIDER */
    .land-divider {
      width: 100%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(92,60,30,0.2), transparent);
      margin: 0 auto;
    }

    /* SECTION */
    .land-section {
      padding: 6rem 6rem;
      max-width: 1300px; margin: 0 auto;
    }

    .section-label {
      font-family: 'DM Mono', monospace;
      font-size: 0.7rem; letter-spacing: 0.2em;
      text-transform: uppercase; color: #5C7A3E;
      margin-bottom: 0.8rem;
    }

    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: clamp(2rem, 3.5vw, 3.2rem);
      font-weight: 700; line-height: 1.15;
      color: #2C1810; margin-bottom: 1rem;
    }

    .section-title em { font-style: italic; color: #B07D3A; }

    .section-body {
      font-size: 1.05rem; line-height: 1.75;
      color: #5C3D1E; max-width: 600px;
    }

    /* HOW IT WORKS */
    .steps-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 2rem; margin-top: 3.5rem;
    }

    .step-card {
      background: rgba(255,252,245,0.7);
      border: 1px solid rgba(92,60,30,0.1);
      border-radius: 20px; padding: 2rem;
      position: relative; overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .step-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(44,24,16,0.1);
    }
    .step-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
    }
    .step-card:nth-child(1)::before { background: linear-gradient(90deg, #5C7A3E, #8AAE5E); }
    .step-card:nth-child(2)::before { background: linear-gradient(90deg, #B07D3A, #D4A054); }
    .step-card:nth-child(3)::before { background: linear-gradient(90deg, #6B4A2A, #8B6540); }

    .step-num {
      font-family: 'Playfair Display', serif;
      font-size: 3.5rem; font-weight: 900;
      color: rgba(44,24,16,0.06); line-height: 1;
      margin-bottom: 0.8rem;
    }
    .step-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.2rem; font-weight: 700;
      color: #2C1810; margin-bottom: 0.6rem;
    }
    .step-body { font-size: 0.9rem; line-height: 1.65; color: #5C3D1E; }

    /* FEATURES */
    .features-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 1.5rem; margin-top: 3rem;
    }
    .feature-item {
      display: flex; gap: 1.2rem; align-items: flex-start;
      background: rgba(255,252,245,0.6);
      border: 1px solid rgba(92,60,30,0.08);
      border-radius: 16px; padding: 1.5rem;
      transition: all 0.2s;
    }
    .feature-item:hover {
      background: rgba(255,252,245,0.95);
      border-color: rgba(92,122,62,0.2);
      transform: translateX(4px);
    }
    .feature-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; flex-shrink: 0;
    }
    .feature-title {
      font-family: 'Playfair Display', serif;
      font-size: 1rem; font-weight: 600;
      color: #2C1810; margin-bottom: 0.3rem;
    }
    .feature-body { font-size: 0.85rem; line-height: 1.6; color: #5C3D1E; }

    /* RESEARCH SECTION */
    .research-card {
      background: linear-gradient(135deg, #1a3a6b 0%, #0f2040 100%);
      border-radius: 28px;
      padding: 3.5rem;
      display: grid; grid-template-columns: 1fr auto;
      gap: 3rem; align-items: center;
      position: relative; overflow: hidden;
      margin-top: 3rem;
    }
    .research-card::before {
      content: '';
      position: absolute; top: -40px; right: -40px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,0.03);
    }
    .research-card::after {
      content: '';
      position: absolute; bottom: -60px; right: 100px;
      width: 280px; height: 280px;
      border-radius: 50%;
      background: rgba(92,122,62,0.08);
    }
    .research-pre {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem; letter-spacing: 0.2em;
      text-transform: uppercase; color: #7CA4D8;
      margin-bottom: 0.8rem;
    }
    .research-title {
      font-family: 'Playfair Display', serif;
      font-size: 1.8rem; font-weight: 700;
      color: #FAFAF8; line-height: 1.3;
      margin-bottom: 1rem;
    }
    .research-meta {
      font-size: 0.82rem; color: #9BB5D4; line-height: 1.6;
    }
    .research-stats {
      display: flex; gap: 2rem; margin-top: 1.8rem;
    }
    .research-stat-val {
      font-family: 'Playfair Display', serif;
      font-size: 2rem; font-weight: 700; color: #FAFAF8;
    }
    .research-stat-lbl {
      font-size: 0.7rem; color: #7CA4D8;
      letter-spacing: 0.08em; margin-top: 2px;
    }
    .research-btns {
      display: flex; flex-direction: column; gap: 0.8rem;
      position: relative; z-index: 1;
    }
    .btn-ieee {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #FAFAF8; border-radius: 12px;
      padding: 0.8rem 1.6rem;
      font-family: 'Lora', serif; font-size: 0.85rem;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-ieee:hover { background: rgba(255,255,255,0.18); transform: translateY(-1px); }
    .btn-ieee-primary {
      background: #5C7A3E;
      border: none; color: white; border-radius: 12px;
      padding: 0.9rem 1.8rem;
      font-family: 'Lora', serif; font-size: 0.85rem;
      cursor: pointer; transition: all 0.2s; font-weight: 500;
    }
    .btn-ieee-primary:hover { background: #6B8E4E; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(92,122,62,0.3); }

    /* STATS BAR */
    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0; background: rgba(255,252,245,0.8);
      border: 1px solid rgba(92,60,30,0.1);
      border-radius: 20px; overflow: hidden;
      margin: 4rem 0;
    }
    .stats-item {
      padding: 2.5rem 2rem; text-align: center;
      border-right: 1px solid rgba(92,60,30,0.08);
    }
    .stats-item:last-child { border-right: none; }

    /* AUTH SECTION */
    .auth-section {
      padding: 6rem;
      background: linear-gradient(180deg, #F5EFE4 0%, #EDE4D4 100%);
    }
    .auth-inner {
      max-width: 520px; margin: 0 auto; text-align: center;
    }
    .auth-card {
      background: rgba(255,252,245,0.9);
      border: 1px solid rgba(92,60,30,0.12);
      border-radius: 28px; padding: 3rem;
      box-shadow: 0 16px 60px rgba(44,24,16,0.1);
      margin-top: 2.5rem;
    }

    .auth-divider {
      display: flex; align-items: center; gap: 1rem;
      margin: 1.5rem 0;
    }
    .auth-divider-line {
      flex: 1; height: 1px; background: rgba(92,60,30,0.12);
    }
    .auth-divider-text {
      font-size: 0.75rem; color: #7A5C3A;
      letter-spacing: 0.08em;
    }

    .auth-input {
      width: 100%;
      background: rgba(245,239,228,0.8);
      border: 1.5px solid rgba(92,60,30,0.15);
      border-radius: 12px; padding: 0.85rem 1.1rem;
      font-family: 'Lora', serif; font-size: 0.95rem;
      color: #2C1810; outline: none;
      transition: border-color 0.2s;
    }
    .auth-input:focus { border-color: #5C7A3E; }
    .auth-input::placeholder { color: #A08060; }

    .btn-google {
      width: 100%;
      background: white;
      border: 1.5px solid rgba(92,60,30,0.15);
      border-radius: 12px; padding: 0.85rem;
      font-family: 'Lora', serif; font-size: 0.95rem;
      color: #2C1810; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      transition: all 0.2s; font-weight: 500;
    }
    .btn-google:hover { border-color: #5C7A3E; box-shadow: 0 4px 16px rgba(92,60,30,0.1); }

    .btn-magic {
      width: 100%;
      background: #2C1810; color: #F5EFE4;
      border: none; border-radius: 12px;
      padding: 0.85rem; margin-top: 0.8rem;
      font-family: 'Lora', serif; font-size: 0.95rem;
      cursor: pointer; transition: all 0.2s; font-weight: 500;
    }
    .btn-magic:hover:not(:disabled) { background: #5C7A3E; }
    .btn-magic:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-guest {
      width: 100%; background: transparent;
      border: 1.5px dashed rgba(92,60,30,0.2);
      border-radius: 12px; padding: 0.75rem;
      margin-top: 0.8rem;
      font-family: 'Lora', serif; font-size: 0.85rem;
      color: #7A5C3A; cursor: pointer; transition: all 0.2s;
    }
    .btn-guest:hover { border-color: #B07D3A; color: #B07D3A; }

    /* FOOTER */
    .land-footer {
      padding: 3rem 6rem;
      border-top: 1px solid rgba(92,60,30,0.1);
      display: flex; align-items: center; justify-content: space-between;
    }
    .footer-logo {
      font-family: 'Playfair Display', serif;
      font-size: 1.1rem; font-weight: 700; color: #2C1810;
    }
    .footer-logo span { color: #5C7A3E; }
    .footer-copy { font-size: 0.8rem; color: #7A5C3A; }

    /* GRAIN OVERLAY */
    .grain {
      position: fixed; inset: 0; pointer-events: none; z-index: 1000;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    /* SCROLL ANIMATION */
    .fade-up {
      opacity: 0; transform: translateY(24px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-up.visible { opacity: 1; transform: translateY(0); }

    @media (max-width: 900px) {
      .land-hero { grid-template-columns: 1fr; padding: 7rem 2rem 3rem; }
      .land-hero-visual { display: none; }
      .land-section { padding: 4rem 2rem; }
      .steps-grid { grid-template-columns: 1fr; }
      .features-grid { grid-template-columns: 1fr; }
      .research-card { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: 1fr 1fr; }
      .land-nav { padding: 1rem 2rem; }
      .land-nav.scrolled { padding: 0.8rem 2rem; }
      .auth-section { padding: 4rem 2rem; }
      .land-footer { flex-direction: column; gap: 1rem; padding: 2rem; text-align: center; }
    }
  `;

  // Intersection observer for fade-ups
  useEffect(() => {
    const els = document.querySelectorAll(".fade-up");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="land-root">
      <style>{css}</style>
      <div className="grain" />

      {/* NAV */}
      <nav className={`land-nav ${showNav ? "scrolled" : ""}`}>
        <div className="land-nav-logo">Posture<span>+</span></div>
        <button className="land-nav-cta"
          onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}>
          Get Started
        </button>
      </nav>

      {/* HERO */}
      <section className="land-hero">
        <div>
          <div className="land-eyebrow">
            <span className="land-eyebrow-dot" />
            IEEE CSPA 2026 · Accepted Research
          </div>

          <h1 className="land-h1">
            The first <em>science-backed</em><br />
            posture monitor<br />
            that <span className="underline-word">actually works.</span>
          </h1>

          <p className="land-sub">
            Posture+ uses a peer-reviewed Multiplicative Temporal Stability framework
            to detect chronic slouch — not just momentary dips. Built on published
            IEEE research. Real-time. No wearables.
          </p>

          <div className="land-hero-actions">
            <button className="btn-primary"
              onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}>
              Start Monitoring →
            </button>
            <button className="btn-ghost"
              onClick={() => document.getElementById("research")?.scrollIntoView({ behavior: "smooth" })}>
              Read the Paper
            </button>
          </div>
        </div>

        {/* HERO VISUAL */}
        <div className="land-hero-visual">
          <div className="hero-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "#7A5C3A", fontFamily: "'DM Mono', monospace", marginBottom: "0.2rem" }}>POSTURE STABILITY INDEX</div>
                <div style={{ fontSize: "0.8rem", color: "#2C1810", fontWeight: 500 }}>Live Session · 4m 32s</div>
              </div>
              <AnimatedPSI />
            </div>
            <div className="hero-zone-bar" />
            <div className="hero-zone-labels">
              <span>● STABLE</span>
              <span>● CAUTION</span>
              <span>● ALERT</span>
            </div>
            <div className="hero-metrics">
              {[
                { val: "88%", lbl: "ACCURACY" },
                { val: "2", lbl: "ALERTS" },
                { val: "1", lbl: "RECALIB" },
              ].map(m => (
                <div key={m.lbl} className="hero-metric">
                  <div className="hero-metric-val">{m.val}</div>
                  <div className="hero-metric-lbl">{m.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ieee-badge">
            <div className="ieee-icon">IEEE</div>
            <div>
              <div className="ieee-text-title">Accepted · CSPA 2026</div>
              <div className="ieee-text-sub">22nd IEEE International Colloquium · Kuala Lumpur</div>
            </div>
          </div>
        </div>
      </section>

      <div className="land-divider" />

      {/* STATS */}
      <div style={{ padding: "0 6rem" }}>
        <div className="stats-row fade-up">
          <div className="stats-item"><StatCounter end={88} suffix="" label="Mean PSI in natural session" /></div>
          <div className="stats-item"><StatCounter end={16} suffix="pt" label="Deeper PSI sensitivity vs additive" /></div>
          <div className="stats-item"><StatCounter end={100} suffix="%" label="Episode-level accuracy" /></div>
          <div className="stats-item"><StatCounter end={27} suffix="min" label="Natural usage session validated" /></div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="land-section">
        <div className="fade-up">
          <div className="section-label">How It Works</div>
          <h2 className="section-title">Three steps to <em>better posture.</em></h2>
        </div>
        <div className="steps-grid">
          {[
            {
              n: "01", title: "Calibrate Once",
              body: "Sit upright for 5 seconds. Posture+ captures your neutral baseline — shoulder width, ear position, spine alignment — and scales everything relative to your body.",
            },
            {
              n: "02", title: "Monitor in Real Time",
              body: "Your webcam tracks head pitch, lateral tilt, and shoulder imbalance at every frame. The PSI engine processes temporal stability — not just snapshots — using a published mathematical framework.",
            },
            {
              n: "03", title: "Get Smarter Over Time",
              body: "Session reports show PSI trends, fatigue patterns, and degradation index. The system auto-recalibrates conservatively to prevent chronic slouch from becoming your new 'normal'.",
            },
          ].map((s, i) => (
            <div key={s.n} className="step-card fade-up" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-body">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="land-divider" />

      {/* FEATURES */}
      <section className="land-section">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "start" }}>
          <div className="fade-up">
            <div className="section-label">Features</div>
            <h2 className="section-title">Built different.<br /><em>Designed to last.</em></h2>
            <p className="section-body" style={{ marginTop: "1rem" }}>
              Every other posture tool fires alerts when you slouch. Posture+ models
              the <em>persistence</em> of your instability — because chronic, stable slouch
              is exactly what hurts your spine over time.
            </p>
          </div>
          <div className="features-grid fade-up">
            {[
              { icon: "🎯", bg: "rgba(92,122,62,0.1)", title: "Multiplicative PSI", body: "Quality × Stability. Chronic degradation can't hide behind short-term steadiness." },
              { icon: "📹", bg: "rgba(176,125,58,0.1)", title: "Webcam Only", body: "No wearables, no sensors, no setup. Just your laptop camera and 5 seconds to calibrate." },
              { icon: "📈", bg: "rgba(107,74,42,0.1)", title: "Session Analytics", body: "PSI slope, fatigue flags, SDI, zone breakdowns — every session saved and analysed." },
              { icon: "🔄", bg: "rgba(92,122,62,0.1)", title: "Guarded Recalibration", body: "Baseline only drifts during verified good posture. Slouch never becomes your new normal." },
              { icon: "⚡", bg: "rgba(176,125,58,0.1)", title: "Real-Time Zones", body: "GREEN, YELLOW, RED with temporal hysteresis — no false alarms from a single bad frame." },
              { icon: "🧠", bg: "rgba(107,74,42,0.1)", title: "Fatigue Detection", body: "Detects cumulative fatigue patterns across a session, not just instantaneous deviation." },
            ].map((f, i) => (
              <div key={f.title} className="feature-item" style={{ transitionDelay: `${i * 0.05}s` }}>
                <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
                <div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-body">{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESEARCH */}
      <section className="land-section" id="research">
        <div className="fade-up">
          <div className="section-label">Research Foundation</div>
          <h2 className="section-title">Not a wellness app.<br /><em>A published framework.</em></h2>
        </div>
        <div className="research-card fade-up">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="research-pre">IEEE CSPA 2026 · Paper #0431</div>
            <div className="research-title">
              PosturePlus: A Multiplicative Temporal<br />Stability Framework for Real-Time<br />Posture Monitoring
            </div>
            <div className="research-meta">
              Manan Verma, Raghav Mehra · Chandigarh University<br />
              <span style={{ color: "#5A9BD4", marginTop: "0.4rem", display: "block" }}>
                22nd IEEE International Colloquium on Signal Processing & Its Applications<br />
                Westin Hotel, Kuala Lumpur · May 1-2, 2026
              </span>
            </div>
            <div className="research-stats">
              {[
                { v: "16pt", l: "Deeper PSI sensitivity" },
                { v: "1.00", l: "Episode accuracy" },
                { v: "88.4", l: "Mean PSI, natural session" },
              ].map(s => (
                <div key={s.l}>
                  <div className="research-stat-val">{s.v}</div>
                  <div className="research-stat-lbl">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="research-btns">
            <button className="btn-ieee-primary"
              onClick={() => window.open("/Posture_Plus_Research.pdf", "_blank")}>
              📄 Read Full Paper
            </button>
            <button className="btn-ieee"
              onClick={() => window.open("/Acceptance_Letter.pdf", "_blank")}>
              🏛 Acceptance Letter
            </button>
          </div>
        </div>
      </section>

      {/* AUTH */}
      <section className="auth-section" id="auth-section">
        <div className="auth-inner">
          <div className="fade-up">
            <div className="section-label" style={{ textAlign: "center" }}>Get Started</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Your spine will<br /><em>thank you later.</em>
            </h2>
            <p style={{ color: "#5C3D1E", fontSize: "0.95rem", lineHeight: 1.7, marginTop: "0.8rem" }}>
              Free to use. No credit card. No hardware.
            </p>
          </div>

          <div className="auth-card fade-up">
            {authMode === "sent" ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📬</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "#2C1810", marginBottom: "0.6rem" }}>
                  Check your inbox
                </div>
                <div style={{ fontSize: "0.9rem", color: "#5C3D1E", lineHeight: 1.6 }}>
                  We sent a magic link to <strong>{email}</strong>.<br />
                  Click it to sign in — no password needed.
                </div>
                <button className="btn-ghost" style={{ marginTop: "1.5rem", width: "100%", borderRadius: "12px" }}
                  onClick={() => { setAuthMode("idle"); setEmail(""); }}>
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {/* Google */}
                <button className="btn-google" onClick={handleGoogle}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="auth-divider">
                  <div className="auth-divider-line" />
                  <span className="auth-divider-text">or sign in with email</span>
                  <div className="auth-divider-line" />
                </div>

                <input
                  className="auth-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleMagicLink()}
                />
                <button className="btn-magic" disabled={sending || !email.trim()} onClick={handleMagicLink}>
                  {sending ? "Sending link..." : "✉ Send Magic Link"}
                </button>

                <div className="auth-divider">
                  <div className="auth-divider-line" />
                  <span className="auth-divider-text">just exploring?</span>
                  <div className="auth-divider-line" />
                </div>

                <button className="btn-guest" onClick={onGuestEnter}>
                  Continue as Guest — no account needed
                </button>

                <p style={{ fontSize: "0.72rem", color: "#A08060", marginTop: "1rem", lineHeight: 1.5 }}>
                  Guest sessions are temporary. Data vanishes on reload.<br />
                  Sign in to save your history.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="land-footer">
        <div className="footer-logo">Posture<span>+</span></div>
        <div className="footer-copy">
          © 2026 · IEEE CSPA 2026 Accepted · Built by Manan Verma
        </div>
      </footer>
    </div>
  );
}