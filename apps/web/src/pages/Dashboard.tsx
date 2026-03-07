import { useState, useEffect } from "react";
import PSIRing from "../components/dashboard/PSIRing";
import PSITrendChart from "../components/dashboard/PSITrendChart";
import InsightsCard from "../components/dashboard/InsightsCard";
import StatsRow from "../components/dashboard/StatsRow";
import { usePosture } from "../context/PostureContext";

export default function Dashboard() {
  const { psi: rawPsi, isCalibrated, weeklyData, stats, alerts, autoRecalibs, accuracy, durationFormatted } = usePosture();
  const livePsi = Math.round(rawPsi);

  useEffect(() => {
    // Scroll the parent scroll container to top when dashboard mounts
    window.scrollTo(0, 0);
    document.querySelector("main")?.scrollTo(0, 0);
  }, []);

  // When user hovers a chart dot, ring shows that day's PSI instead of live
  const [hoveredPsi, setHoveredPsi] = useState<number | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // Today's stored daily average from DB (weeklyData slot 6)
  const todayAvgPsi = (weeklyData[6] != null && (weeklyData[6] as number) > 0)
    ? (weeklyData[6] as number)
    : null;

  // Ring display priority:
  // 1. Hovering a chart day → that day's avg
  // 2. Live session running → live PSI
  // 3. No session, has today's avg → today's avg
  // 4. Nothing → no session
  const displayPsi =
    hoveredPsi !== null ? hoveredPsi
    : isCalibrated      ? livePsi
    : todayAvgPsi       ?? 0;

  const isHoveringNullDay = hoveredPsi === 0;
  const noSession =
    isHoveringNullDay ||
    (hoveredPsi === null && !isCalibrated && todayAvgPsi === null);

  // Colours always follow the displayed value
  const psiColor =
    noSession ? "var(--text-muted)"
      : displayPsi >= 80 ? "var(--accent-primary-bright)"
        : displayPsi >= 60 ? "var(--accent-gold-bright)"
          : "var(--accent-danger)";

  const psiGlow =
    noSession ? "none"
      : displayPsi >= 80 ? "var(--shadow-glow-green)"
        : displayPsi >= 60 ? "var(--shadow-glow-gold)"
          : "0 0 32px rgba(255,95,82,0.2), 0 4px 20px rgba(0,0,0,0.5)";

  const psiLabel =
    noSession ? "NO SESSION"
      : displayPsi >= 80 ? "EXCELLENT"
        : displayPsi >= 60 ? "MODERATE"
          : "POOR";

  const psiBadgeClass =
    noSession ? "badge-moderate"
      : displayPsi >= 80 ? "badge-excellent"
        : displayPsi >= 60 ? "badge-moderate"
          : "badge-poor";

  // Insights reflect live session
  const insights = isCalibrated ? [
    {
      icon: livePsi >= 80 ? "✓" : livePsi >= 60 ? "~" : "↓",
      text: `Current PSI: ${livePsi} — ${livePsi >= 80 ? "Great posture!" : livePsi >= 60 ? "Minor corrections needed" : "Poor posture detected"}`,
      color: psiColor,
    },
    {
      icon: "⏱",
      text: `Session time: ${durationFormatted}`,
      color: "var(--accent-secondary)",
    },
    {
      icon: "⚡",
      text: `${alerts} correction alert${alerts !== 1 ? "s" : ""} this session`,
      color: alerts > 5 ? "var(--accent-danger)" : "#E9A84C",
    },
    {
      icon: "✓",
      text: `Posture accuracy: ${accuracy}% time in good zone`,
      color: accuracy >= 70 ? "#4CAF82" : "var(--text-muted)",
    },
    {
      icon: "↺",
      text: `Auto-recalibrations: ${autoRecalibs} this session`,
      color: autoRecalibs > 0 ? "var(--accent-primary)" : "var(--text-muted)",
    },
  ] : undefined;

  return (
    <>
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-teal" />
        <div className="mesh-green" />
      </div>

      <div
        className="relative flex flex-col min-h-screen"
        style={{ padding: "2rem", gap: "1.6rem", zIndex: 1 }}
      >
        {/* HEADER */}
        <header className="flex items-center justify-between flex-shrink-0 animate-fade-up">
          <div>
            <h2
              className="display-font"
              style={{
                fontSize: "2.6rem", letterSpacing: "-0.01em", lineHeight: 1.05,
                background: "linear-gradient(120deg,var(--text-primary),var(--accent-primary-bright))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              Posture Dashboard
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {isCalibrated ? "Live session active" : "Start a session in Monitor to see live data"}
            </p>
          </div>

          <div className="glass-premium shimmer-card rounded-2xl px-5 py-3 text-right">
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Today</p>
            <p style={{ fontSize: "0.8rem", color: "var(--accent-gold-bright)", fontWeight: 500 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
        </header>

        <div className="divider-gold" />

        {/* MAIN GRID */}
        <div className="grid flex-1 min-h-0 gap-6" style={{ gridTemplateColumns: "230px 1fr 320px" }}>

          {/* PSI RING — reacts to chart hover */}
          <div
            className="glass-premium psi-card shimmer-card rounded-2xl p-7 flex flex-col items-center justify-center float-card"
            style={{ boxShadow: psiGlow, border: "1px solid var(--border-green)", transition: "box-shadow 0.3s ease" }}
          >
            <div style={{
              position: "absolute", width: 180, height: 180, borderRadius: "50%",
              background: `radial-gradient(circle, ${psiColor}30 0%, transparent 70%)`,
              filter: "blur(18px)", pointerEvents: "none", transition: "background 0.3s ease",
            }} />

            <PSIRing
              value={noSession ? null : displayPsi}
              size={150}
            />

            <div className="mt-4 text-center">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.12em] ${psiBadgeClass}`}>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isCalibrated && hoveredPsi === null ? "animate-blink" : ""}`}
                  style={{ background: psiColor }}
                />
                {psiLabel}
              </span>

              {/* Sub-label: shows day name when hovering, "live" otherwise */}
              <p className="text-[10px] mt-1.5 font-mono" style={{ color: "var(--text-faint)" }}>
                {hoveredPsi !== null
                  ? hoveredLabel
                  : isCalibrated
                    ? "● live"
                    : todayAvgPsi !== null
                      ? "today's avg"
                      : "posture score"}
              </p>
            </div>
          </div>

          {/* TREND CHART */}
          <div className="glass-premium chart-card rounded-2xl overflow-hidden float-card">
            <div className="stat-accent-bar" style={{ background: "var(--gradient-teal)" }} />
            <div style={{ padding: "1.3rem", height: "100%" }}>
              <PSITrendChart
                data={weeklyData}
                onHoverChange={(val, label) => {
                  setHoveredPsi(val);
                  setHoveredLabel(label);
                }}
              />
            </div>
          </div>

          {/* INSIGHTS */}
          <div className="glass-premium rounded-2xl overflow-hidden float-card">
            <div className="stat-accent-bar" style={{ background: "var(--gradient-gold)" }} />
            <div style={{ padding: "1.3rem", height: "100%" }}>
              <div className="flex justify-between mb-3">
                <p style={{ fontSize: "11px", letterSpacing: "0.12em", color: "var(--text-muted)", fontWeight: 600 }}>
                  INSIGHTS
                </p>
                <span
                  className={`w-2 h-2 rounded-full ${isCalibrated ? "animate-pulse-ring" : ""}`}
                  style={{ background: isCalibrated ? "var(--accent-gold)" : "var(--text-faint)" }}
                />
              </div>
              <InsightsCard insights={insights} barValues={weeklyData} />
            </div>
          </div>

        </div>

        {/* STATS ROW */}
        <div className="animate-fade-up">
          <StatsRow stats={stats} />
        </div>

      </div>
    </>
  );
}