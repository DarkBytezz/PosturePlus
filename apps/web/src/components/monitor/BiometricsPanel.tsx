import Sparkline from "./Sparkline";
import type { InsightMessage } from "../../pose/insights/PostureInsights";

type HeatmapData = {
  forward:  number;  // 0–1 accumulated severity
  lateral:  number;
  shoulder: number;
};

type Props = {
  psi?:              number;
  accuracy:          number;
  durationFormatted: string;
  zone?:             "GREEN" | "YELLOW" | "RED";
  psiHistory:        number[];
  forward_dev:       number;
  lateral_dev:       number;
  shoulder_dev:      number;
  heatmap:           HeatmapData;
  insights:          InsightMessage[];
  alertActive:       boolean;   // true when red alert is firing
  redStreakSec:      number;    // seconds in current RED streak
};

// ── Deviation bar ────────────────────────────────────────────────────────────
function DevBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--text-faint)" }}>{label}</span>
        <span className="text-[9px] font-mono" style={{ color }}>
          {value >= 0 ? "+" : ""}{value.toFixed(3)}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}80` }}
        />
      </div>
    </div>
  );
}

// ── Heatmap bar ───────────────────────────────────────────────────────────────
function HeatBar({ label, value, isWorst }: { label: string; value: number; isWorst: boolean }) {
  const pct = Math.min(value, 1) * 100;
  const color = value > 0.6 ? "var(--chart-poor)" : value > 0.3 ? "var(--chart-caution)" : "var(--status-green)";
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          {isWorst && (
            <span className="text-[7px] px-1 py-0.5 rounded font-bold"
              style={{ background: "rgba(255,95,82,0.15)", color: "var(--chart-poor)" }}>WORST</span>
          )}
          <span className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: isWorst ? color : "var(--text-faint)" }}>{label}</span>
        </div>
        <span className="text-[9px] font-mono" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width:      `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow:  isWorst ? `0 0 8px ${color}60` : "none",
          }}
        />
      </div>
    </div>
  );
}

export default function BiometricsPanel({
  psi, accuracy, durationFormatted, zone = "GREEN",
  psiHistory, forward_dev, lateral_dev, shoulder_dev,
  heatmap, insights, alertActive, redStreakSec,
}: Props) {

  const psiColor =
    psi === undefined ? "var(--text-muted)"
    : psi >= 80 ? "var(--status-green)"
    : psi >= 60 ? "var(--chart-caution)"
    : "var(--chart-poor)";

  const zoneColor =
    zone === "RED" ? "var(--chart-poor)" : zone === "YELLOW" ? "var(--chart-caution)" : "var(--status-green)";

  // Worst heatmap axis
  const heatEntries = [
    { key: "forward",  label: "Forward Lean",       value: heatmap.forward  },
    { key: "lateral",  label: "Lateral Tilt",        value: heatmap.lateral  },
    { key: "shoulder", label: "Shoulder Imbalance",  value: heatmap.shoulder },
  ];
  const worstKey = [...heatEntries].sort((a, b) => b.value - a.value)[0].key;

  return (
    <div className="flex flex-col gap-3 h-full" style={{ width: "320px" }}>

      {/* ── Zone + alert status ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{
          background: `${zoneColor}10`,
          border:     `1px solid ${zoneColor}35`,
          transition: "all 0.4s ease",
          boxShadow:  alertActive ? `0 0 20px ${zoneColor}30` : "none",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: zoneColor,
              boxShadow:  `0 0 8px ${zoneColor}`,
              animation:  zone === "RED" ? "livePulse 0.8s ease infinite" : "livePulse 2s ease infinite",
            }}
          />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: zoneColor }}>
            {zone === "RED" && alertActive ? "⚡ ALERT" : zone}
          </span>
        </div>

        {zone === "RED" && redStreakSec > 0 && (
          <span className="text-[9px] font-mono" style={{ color: "var(--chart-poor)" }}>
            {redStreakSec}s in red
          </span>
        )}

        <span className="text-[9px] font-mono" style={{ color: "var(--text-faint)" }}>
          {durationFormatted}
        </span>
      </div>

      {/* ── PSI + accuracy ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <div>
          <p className="text-[9px] uppercase tracking-widest font-semibold mb-1"
            style={{ color: "var(--text-faint)" }}>PSI Score</p>
          <p className="text-3xl font-bold font-mono leading-none" style={{ color: psiColor,
            fontFamily: "'DM Serif Display', serif" }}>
            {psi !== undefined ? psi : "--"}
          </p>
          <p className="text-[9px] mt-1" style={{ color: "var(--text-faint)" }}>/100</p>
        </div>

        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest font-semibold mb-1"
            style={{ color: "var(--text-faint)" }}>Accuracy</p>
          <p className="text-2xl font-bold font-mono" style={{ color: "var(--status-green)",
            fontFamily: "'DM Serif Display', serif" }}>{accuracy}%</p>
        </div>
      </div>

      {/* ── PSI Sparkline ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2"
          style={{ color: "var(--text-faint)" }}>PSI Live</p>
        <Sparkline values={psiHistory.slice(-40)} zone={zone} />
      </div>

      {/* ── Live deviation bars ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <p className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--text-faint)" }}>Live Deviations</p>
        <DevBar label="Forward Lean"       value={forward_dev}  max={0.12} color={Math.abs(forward_dev)  > 0.12 ? "var(--chart-poor)" : Math.abs(forward_dev)  > 0.06 ? "var(--chart-caution)" : "var(--status-green)"} />
        <DevBar label="Lateral Tilt"       value={lateral_dev}  max={0.12} color={Math.abs(lateral_dev)  > 0.12 ? "var(--chart-poor)" : Math.abs(lateral_dev)  > 0.06 ? "var(--chart-caution)" : "var(--status-green)"} />
        <DevBar label="Shoulder Imbalance" value={shoulder_dev} max={0.08} color={Math.abs(shoulder_dev) > 0.08 ? "var(--chart-poor)" : Math.abs(shoulder_dev) > 0.04 ? "var(--chart-caution)" : "var(--status-green)"} />
      </div>

      {/* ── Posture heatmap ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        <p className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--text-faint)" }}>60s Heatmap</p>
        {heatEntries.map(({ key, label, value }) => (
          <HeatBar key={key} label={label} value={value} isWorst={key === worstKey && value > 0.05} />
        ))}
      </div>

      {/* ── Smart insights ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-2.5 flex-1"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <p className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--text-faint)" }}>Insights</p>
        {insights.map((msg, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-sm leading-none mt-0.5">{msg.icon}</span>
            <p className="text-[11px] leading-relaxed"
              style={{
                color: msg.severity === "good" ? "var(--status-green)"
                     : msg.severity === "warn" ? "var(--chart-caution)"
                     : "var(--text-muted)",
              }}>
              {msg.text}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}