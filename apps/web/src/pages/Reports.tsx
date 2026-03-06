import { useState } from "react";
import { usePosture } from "../context/PostureContext";
import type { SessionRecord } from "../hooks/usePostureStream";

// ── Tiny inline sparkline for session cards ──────────────────────────────────
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) {
    return (
      <svg viewBox="0 0 120 32" width="120" height="32">
        <line x1="0" y1="16" x2="120" y2="16"
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
        <text x="60" y="20" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.2)">no data</text>
      </svg>
    );
  }
  const W = 120; const H = 32;
  const dMin = Math.min(...values); const dMax = Math.max(...values);
  const range = dMax - dMin || 1;
  const pad = range * 0.2;
  const vMin = dMin - pad; const vMax = dMax + pad; const vRange = vMax - vMin;
  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - vMin) / vRange) * H;
  const pts = values.map((v, i) => ({ x: toX(i), y: toY(v) }));

  const T = 0.35;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i]; const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${p1.x + (p2.x - p0.x) * T},${p1.y + (p2.y - p0.y) * T} ${p2.x - (p3.x - p1.x) * T},${p2.y - (p3.y - p1.y) * T} ${p2.x},${p2.y}`;
  }
  const area = `${d} L ${pts[pts.length-1].x},${H} L 0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="120" height="32" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2.5"
        fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );
}

// ── Zone bar ─────────────────────────────────────────────────────────────────
function ZoneBar({ green, yellow, red }: { green: number; yellow: number; red: number }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex gap-px" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div style={{ width: `${green}%`,  background: "var(--status-green)", borderRadius: "9999px 0 0 9999px", transition: "width 0.8s ease" }} />
      <div style={{ width: `${yellow}%`, background: "#fbbf24" }} />
      <div style={{ width: `${red}%`,    background: "#ff5f52", borderRadius: "0 9999px 9999px 0", transition: "width 0.8s ease" }} />
    </div>
  );
}

// ── PSI grade chip ────────────────────────────────────────────────────────────
function PsiChip({ value }: { value: number }) {
  const [color, label] =
    value >= 80 ? ["var(--status-green)", "EXCELLENT"] :
    value >= 60 ? ["#fbbf24",  "MODERATE"]  :
                  ["#ff5f52",  "POOR"];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest"
      style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ── Format duration ───────────────────────────────────────────────────────────
function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Session detail modal ──────────────────────────────────────────────────────
function SessionModal({ session, onClose }: { session: SessionRecord; onClose: () => void }) {
  const psiColor = session.meanPsi >= 80 ? "var(--status-green)" : session.meanPsi >= 60 ? "#fbbf24" : "#ff5f52";

  const metrics = [
    { label: "Mean PSI",           value: session.meanPsi,                    unit: "",   color: psiColor },
    { label: "Peak PSI",           value: session.maxPsi,                     unit: "",   color: "var(--status-green)" },
    { label: "Minimum PSI",        value: session.minPsi,                     unit: "",   color: "#ff5f52" },
    { label: "Accuracy",           value: session.accuracy,                   unit: "%",  color: "var(--status-green)" },
    { label: "Correction Alerts",  value: session.alerts,                     unit: "",   color: "#fbbf24" },
    { label: "Auto-recalibrations",value: session.autoRecalibs,               unit: "",   color: "var(--status-green)" },
    { label: "PSI Slope",          value: session.psiSlope.toFixed(4),        unit: "/s", color: session.psiSlope >= 0 ? "#4ade80" : "#fbbf24" },
    { label: "Stability (SDI)",    value: session.sdi.toFixed(1),             unit: "",   color: session.sdi < 5 ? "#4ade80" : session.sdi < 10 ? "#fbbf24" : "#ff5f52" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-[520px] max-h-[80vh] overflow-y-auto rounded-3xl"
        style={{
          background: "linear-gradient(180deg, var(--bg-secondary), var(--bg-elevated))",
          border: "1px solid var(--border-medium)",
          boxShadow: `0 0 60px ${psiColor}20, 0 24px 64px rgba(0,0,0,0.6)`,
          padding: "2rem",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase font-semibold mb-1" style={{ color: "var(--text-faint)" }}>
              Session Report
            </p>
            <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "'DM Serif Display', serif" }}>
              {session.date}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <PsiChip value={session.meanPsi} />
              {session.fatigueFlag && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(255,95,82,0.12)", color: "#ff5f52", border: "1px solid rgba(255,95,82,0.25)" }}>
                  ⚡ FATIGUE DETECTED
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
          >×</button>
        </div>

        {/* Duration + zone bar */}
        <div className="mb-5 p-4 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Duration</span>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{fmtDuration(session.durationSec)}</span>
          </div>
          <ZoneBar green={session.greenPct} yellow={session.yellowPct} red={session.redPct} />
          <div className="flex justify-between mt-2">
            {[
              { label: "Good",    pct: session.greenPct,  color: "var(--status-green)" },
              { label: "Caution", pct: session.yellowPct, color: "#fbbf24" },
              { label: "Poor",    pct: session.redPct,    color: "#ff5f52" },
            ].map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                <span className="text-[9px] font-mono" style={{ color: "var(--text-faint)" }}>{label} {pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* PSI sparkline */}
        <div className="mb-5 p-4 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-faint)" }}>PSI Timeline</p>
          <div style={{ width: "100%", height: 64 }}>
            <svg viewBox="0 0 460 64" width="100%" height="64" style={{ overflow: "visible" }}>
              {session.psiTimeline.length >= 2 ? (() => {
                const vals = session.psiTimeline;
                const dMin = Math.min(...vals); const dMax = Math.max(...vals);
                const vRange = (dMax - dMin) || 1;
                const pad = vRange * 0.25;
                const vMin = dMin - pad; const vMax2 = dMax + pad; const vR = vMax2 - vMin;
                const toX = (i: number) => (i / (vals.length - 1)) * 460;
                const toY = (v: number) => 64 - ((v - vMin) / vR) * 56;
                const pts = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));
                const T = 0.35;
                let d = `M ${pts[0].x},${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[Math.max(i-1,0)], p1 = pts[i], p2 = pts[i+1], p3 = pts[Math.min(i+2,pts.length-1)];
                  d += ` C ${p1.x+(p2.x-p0.x)*T},${p1.y+(p2.y-p0.y)*T} ${p2.x-(p3.x-p1.x)*T},${p2.y-(p3.y-p1.y)*T} ${p2.x},${p2.y}`;
                }
                const area = `${d} L 460,64 L 0,64 Z`;
                return (
                  <>
                    <defs>
                      <linearGradient id="modal-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={psiColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={psiColor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={area} fill="url(#modal-area)" />
                    <path d={d} fill="none" stroke={psiColor} strokeWidth="2" strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 4px ${psiColor})` }} />
                  </>
                );
              })() : (
                <text x="230" y="36" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.2)">Not enough data</text>
              )}
            </svg>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ label, value, unit, color }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-faint)" }}>{label}</p>
              <p className="text-lg font-bold font-mono" style={{ color }}>
                {value}{unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session, index, onClick }: { session: SessionRecord; index: number; onClick: () => void }) {
  const psiColor = session.meanPsi >= 80 ? "#4ade80" : session.meanPsi >= 60 ? "#fbbf24" : "#ff5f52";

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{
        background: "linear-gradient(180deg, var(--bg-secondary), var(--bg-elevated))",
        border: "1px solid var(--border-subtle)",
        padding: "1.25rem 1.5rem",
        animation: `fade-up 0.4s ease ${index * 60}ms both`,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${psiColor}50`;
        (e.currentTarget as HTMLElement).style.boxShadow   = `0 0 24px ${psiColor}12`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
        (e.currentTarget as HTMLElement).style.boxShadow   = "none";
      }}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: psiColor, opacity: 0.7 }} />

      <div className="flex items-center justify-between gap-4">
        {/* Left: date + chips */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{session.date}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <PsiChip value={session.meanPsi} />
            {session.fatigueFlag && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,95,82,0.12)", color: "#ff5f52" }}>⚡ Fatigue</span>
            )}
          </div>
          {/* Zone bar */}
          <div className="w-32 mt-1">
            <ZoneBar green={session.greenPct} yellow={session.yellowPct} red={session.redPct} />
          </div>
        </div>

        {/* Middle: key stats */}
        <div className="flex gap-5 flex-shrink-0">
          {[
            { label: "PSI",      value: session.meanPsi,              unit: "",  color: psiColor },
            { label: "Duration", value: fmtDuration(session.durationSec), unit: "", color: "var(--text-muted)" },
            { label: "Accuracy", value: session.accuracy,             unit: "%", color: "var(--status-green)" },
            { label: "Alerts",   value: session.alerts,               unit: "",  color: "#fbbf24" },
            { label: "Recalib.", value: session.autoRecalibs,         unit: "",  color: "var(--accent-primary)" },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <p className="text-[8px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-faint)" }}>{label}</p>
              <p className="text-sm font-bold font-mono" style={{ color }}>{value}{unit}</p>
            </div>
          ))}
        </div>

        {/* Right: sparkline + arrow */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <MiniSparkline values={session.psiTimeline} color={psiColor} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="group-hover:translate-x-0.5 transition-transform">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Live session summary banner ───────────────────────────────────────────────
function LiveBanner() {
  const {
    isCalibrated, psi, accuracy, alerts, autoRecalibs,
    greenSeconds, yellowSeconds, redSeconds, totalSeconds,
    durationFormatted, minPsi, maxPsi, psiHistory,
  } = usePosture();

  if (!isCalibrated) return null;

  const livePsi   = Math.round(psi);
  const psiColor  = livePsi >= 80 ? "#4ade80" : livePsi >= 60 ? "#fbbf24" : "#ff5f52";
  const total     = totalSeconds || 1;
  const greenPct  = Math.round((greenSeconds  / total) * 100);
  const yellowPct = Math.round((yellowSeconds / total) * 100);
  const redPct    = Math.round((redSeconds    / total) * 100);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--bg-secondary), var(--bg-elevated))",
        border: `1px solid ${psiColor}40`,
        boxShadow: `0 0 32px ${psiColor}15`,
        padding: "1.5rem 2rem",
        marginBottom: "0.5rem",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-blink" />
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--status-green)" }}>Live Session</p>
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{durationFormatted}</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1fr 160px" }}>
        {/* PSI + stats */}
        <div className="flex flex-col gap-1">
          <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-faint)" }}>Current PSI</p>
          <p className="text-3xl font-bold font-mono" style={{ color: psiColor, fontFamily: "'DM Serif Display', serif" }}>
            {livePsi}
          </p>
          <PsiChip value={livePsi} />
        </div>

        <div className="grid grid-cols-2 gap-3 col-span-1">
          {[
            { label: "Min PSI",    value: minPsi,       color: "#ff5f52" },
            { label: "Max PSI",    value: maxPsi,       color: "var(--status-green)" },
            { label: "Accuracy",   value: `${accuracy}%`, color: "var(--status-green)" },
            { label: "Alerts",     value: alerts,       color: "#fbbf24" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[8px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{label}</p>
              <p className="text-sm font-bold font-mono" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 justify-center">
          <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-faint)" }}>Zone Breakdown</p>
          <ZoneBar green={greenPct} yellow={yellowPct} red={redPct} />
          <div className="flex gap-3 mt-1">
            {[
              { label: "Good",    pct: greenPct,  color: "var(--status-green)" },
              { label: "Caution", pct: yellowPct, color: "#fbbf24" },
              { label: "Poor",    pct: redPct,    color: "#ff5f52" },
            ].map(({ label, pct, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                <span className="text-[8px] font-mono" style={{ color: "var(--text-faint)" }}>{pct}%</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Auto-recalib</span>
            <span className="text-xs font-bold font-mono" style={{ color: "var(--accent-primary)" }}>{autoRecalibs}</span>
          </div>
        </div>

        {/* Live sparkline */}
        <div className="flex flex-col justify-center">
          <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--text-faint)" }}>PSI Live</p>
          <MiniSparkline values={psiHistory.slice(-40)} color={psiColor} />
        </div>
      </div>
    </div>
  );
}

// ── Aggregate stats across all sessions ──────────────────────────────────────
function AggregateRow({ sessions }: { sessions: SessionRecord[] }) {
  if (sessions.length === 0) return null;

  const totalTime    = sessions.reduce((a, s) => a + s.durationSec, 0);
  const avgPsi       = Math.round(sessions.reduce((a, s) => a + s.meanPsi, 0) / sessions.length);
  const avgAccuracy  = Math.round(sessions.reduce((a, s) => a + s.accuracy, 0) / sessions.length);
  const totalAlerts  = sessions.reduce((a, s) => a + s.alerts, 0);
  const totalRecalib = sessions.reduce((a, s) => a + s.autoRecalibs, 0);
  const fatigueCount = sessions.filter(s => s.fatigueFlag).length;

  const items = [
    { label: "Total Sessions",    value: sessions.length,          unit: "",  color: "var(--accent-primary)" },
    { label: "Total Time",        value: fmtDuration(totalTime),   unit: "",  color: "var(--text-primary)" },
    { label: "Avg PSI",           value: avgPsi,                   unit: "",  color: avgPsi >= 80 ? "#4ade80" : avgPsi >= 60 ? "#fbbf24" : "#ff5f52" },
    { label: "Avg Accuracy",      value: avgAccuracy,              unit: "%", color: "var(--status-green)" },
    { label: "Total Alerts",      value: totalAlerts,              unit: "",  color: "#fbbf24" },
    { label: "Auto-recalibs",     value: totalRecalib,             unit: "",  color: "var(--accent-primary)" },
    { label: "Fatigue Sessions",  value: fatigueCount,             unit: "",  color: "#ff5f52" },
  ];

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "0.25rem" }}>
      {items.map(({ label, value, unit, color }, i) => (
        <div key={label}
          className="rounded-2xl flex flex-col gap-1 p-4"
          style={{
            background: "linear-gradient(180deg, var(--bg-secondary), var(--bg-elevated))",
            border: "1px solid var(--border-subtle)",
            animation: `fade-up 0.4s ease ${i * 50}ms both`,
          }}
        >
          <p className="text-[8px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-faint)" }}>{label}</p>
          <p className="text-xl font-bold font-mono" style={{ color, fontFamily: "'DM Serif Display', serif" }}>
            {value}{unit}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main Reports page ─────────────────────────────────────────────────────────
export default function Reports() {
  const { sessionHistory } = usePosture();
  const [selected, setSelected] = useState<SessionRecord | null>(null);

  return (
    <>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-teal" />
        <div className="mesh-green" />
      </div>

      <div className="relative h-screen overflow-y-auto" style={{ zIndex: 1, padding: "2rem" }}>

        {/* Header */}
        <header className="flex items-end justify-between mb-6" style={{ animation: "fade-up 0.4s ease both" }}>
          <div>
            <h2
              style={{
                fontSize: "2.4rem", letterSpacing: "-0.01em", lineHeight: 1.05,
                fontFamily: "'DM Serif Display', serif",
                background: "linear-gradient(120deg, var(--text-primary), var(--accent-primary-bright))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              Session Reports
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {sessionHistory.length > 0
                ? `${sessionHistory.length} session${sessionHistory.length !== 1 ? "s" : ""} recorded`
                : "Sessions appear here after you stop monitoring"}
            </p>
          </div>

          {sessionHistory.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }} /> Good
              <span className="w-2 h-2 rounded-full ml-2" style={{ background: "#fbbf24" }} /> Caution
              <span className="w-2 h-2 rounded-full ml-2" style={{ background: "#ff5f52" }} /> Poor
            </div>
          )}
        </header>

        <div className="divider-gold" style={{ marginBottom: "1.5rem" }} />

        {/* Live session banner */}
        <LiveBanner />

        {/* Aggregate row */}
        <AggregateRow sessions={sessionHistory} />

        {/* History list */}
        {sessionHistory.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-3xl"
            style={{
              border: "1px dashed var(--border-medium)",
              padding: "5rem 2rem",
              marginTop: "1rem",
              animation: "fade-up 0.5s ease 0.2s both",
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--accent-glow)", border: "1px solid var(--border-subtle)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No sessions yet</p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Start a posture session in Monitor — your report will appear here when you stop.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {sessionHistory.map((session, i) => (
              <SessionCard
                key={session.id}
                session={session}
                index={i}
                onClick={() => setSelected(session)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <SessionModal session={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}