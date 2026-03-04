import { useEffect, useMemo, useState } from "react";

type PSITrendChartProps = {
  data?:          number[];
  labels?:        string[];
  onHoverChange?: (value: number | null, label: string | null) => void;
};

const DEFAULT_DATA   = [65, 72, 70, 78, 75, 85, 82];
const DEFAULT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Catmull-Rom spline — smooth through all points
function catmullRom(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const T = 0.4;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${p1.x + (p2.x - p0.x) * T},${p1.y + (p2.y - p0.y) * T} ${p2.x - (p3.x - p1.x) * T},${p2.y - (p3.y - p1.y) * T} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function PSITrendChart({
  data   = DEFAULT_DATA,
  labels = DEFAULT_LABELS,
  onHoverChange,
}: PSITrendChartProps) {
  const [lineDrawn,    setLineDrawn]    = useState(false);
  const [hovered,      setHovered]      = useState<number | null>(null);

  const W  = 560;
  const H  = 180;
  const PL = 38;   // left padding — room for Y labels
  const PR = 16;
  const PT = 16;
  const PB = 28;   // bottom — room for day labels

  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const safe = data.map(v => Math.max(0, Math.min(100, v)));

  // Y scale: autoscale so movement is always visible
  const dMin  = Math.min(...safe);
  const dMax  = Math.max(...safe);
  const dRange = dMax - dMin;
  const pad   = Math.max(dRange * 0.3, 8);
  const vMin  = Math.max(0,   dMin - pad);
  const vMax  = Math.min(100, dMax + pad);
  const vRange = vMax - vMin || 1;

  const toX = (i: number) => PL + (i / (safe.length - 1)) * chartW;
  const toY = (v: number) => PT + chartH - ((v - vMin) / vRange) * chartH;

  const pts = useMemo(() =>
    safe.map((v, i) => ({ x: toX(i), y: toY(v), v })),
    [safe]
  );

  const linePath = useMemo(() => catmullRom(pts), [pts]);
  const areaPath = linePath
    ? `${linePath} L ${pts[pts.length-1].x},${PT + chartH} L ${pts[0].x},${PT + chartH} Z`
    : "";

  useEffect(() => {
    const t = setTimeout(() => setLineDrawn(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Notify parent of hover state
  const handleEnter = (i: number) => {
    setHovered(i);
    onHoverChange?.(safe[i], labels[i] ?? null);
  };
  const handleLeave = () => {
    setHovered(null);
    onHoverChange?.(null, null);
  };

  const activeIdx = hovered ?? safe.length - 1;
  const activeP   = pts[activeIdx];
  const activeV   = safe[activeIdx];
  const activeL   = labels[activeIdx] ?? "";

  // Pill position — clamp inside chart
  const pillW  = 48;
  const pillH  = 30;
  const pillX  = Math.max(PL, Math.min(activeP.x - pillW / 2, W - PR - pillW));
  const pillY  = Math.max(4,  activeP.y - pillH - 10);

  // Y-axis ticks
  const tickStep  = dRange > 20 ? 20 : dRange > 8 ? 10 : 5;
  const tickStart = Math.ceil(vMin / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let t = tickStart; t <= vMax; t += tickStep) yTicks.push(t);

  // Colour by value
  const valueColor = (v: number) =>
    v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#ff5f52";

  const lineColor = valueColor(activeV);

  // Improvement: compare first non-zero day to last non-zero day
  // Avoids ÷0 explosion when early days have no data yet
  const nonZero    = safe.filter(v => v > 0);
  const firstVal   = nonZero[0] ?? 0;
  const lastVal    = nonZero[nonZero.length - 1] ?? 0;
  const improvement = firstVal > 0
    ? (((lastVal - firstVal) / firstVal) * 100).toFixed(1)
    : "0";

  return (
    <div
      className="relative overflow-hidden rounded-2xl flex flex-col"
      style={{
        background: "var(--bg-secondary)",
        border:     "1px solid var(--border-subtle)",
        boxShadow:  "var(--shadow-card)",
        padding:    "1.25rem",
        height:     "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-3 flex-shrink-0">
        <div>
          <p className="text-[10px] tracking-[0.14em] uppercase font-semibold"
            style={{ color: "var(--text-faint)" }}>
            Weekly PSI
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {hovered !== null ? activeL : "Today"} ·{" "}
            <span style={{ color: lineColor, fontWeight: 700 }}>{activeV}</span>
          </p>
        </div>

        <div
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
          style={{
            background: Number(improvement) >= 0 ? "rgba(74,222,128,0.1)" : "rgba(255,95,82,0.1)",
            color:      Number(improvement) >= 0 ? "#4ade80" : "#ff5f52",
            border:     `1px solid ${Number(improvement) >= 0 ? "rgba(74,222,128,0.2)" : "rgba(255,95,82,0.2)"}`,
          }}
        >
          {firstVal > 0
            ? `${Number(improvement) >= 0 ? "+" : ""}${improvement}%`
            : "—"
          }
        </div>
      </div>

      {/* SVG Chart */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%" height="100%"
          style={{ overflow: "visible" }}
          onMouseLeave={handleLeave}
        >
          <defs>
            <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lineColor} stopOpacity="0.22" />
              <stop offset="60%"  stopColor={lineColor} stopOpacity="0.05" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
            </linearGradient>
            <filter id="trendGlow">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="trendClip">
              <rect x={PL} y={PT} width={chartW} height={chartH} />
            </clipPath>
          </defs>

          {/* Y-axis grid lines + labels */}
          {yTicks.map(t => {
            const y = toY(t);
            return (
              <g key={t}>
                <line
                  x1={PL} y1={y} x2={W - PR} y2={y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={PL - 6} y={y + 3.5}
                  textAnchor="end" fontSize="8.5"
                  fill="rgba(255,255,255,0.22)" fontFamily="monospace"
                >{t}</text>
              </g>
            );
          })}

          {/* Vertical hover line */}
          <line
            x1={activeP.x} y1={PT}
            x2={activeP.x} y2={PT + chartH}
            stroke={lineColor} strokeWidth="1"
            strokeDasharray="4 3" opacity="0.35"
          />

          {/* Area fill */}
          <path d={areaPath} fill="url(#trendArea)" clipPath="url(#trendClip)" />

          {/* Main line */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            clipPath="url(#trendClip)"
            filter="url(#trendGlow)"
            style={{
              strokeDasharray:  1200,
              strokeDashoffset: lineDrawn ? 0 : 1200,
              transition:       "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />

          {/* Day labels + hit areas */}
          {pts.map((p, i) => {
            const isActive = i === activeIdx;
            const col = valueColor(safe[i]);
            return (
              <g key={i}>
                {/* Invisible wide hit strip for easy hover */}
                <rect
                  x={p.x - chartW / (safe.length * 2)}
                  y={PT}
                  width={chartW / safe.length}
                  height={chartH + PB}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onMouseEnter={() => handleEnter(i)}
                />

                {/* Dot outer ring */}
                <circle cx={p.x} cy={p.y} r={isActive ? 7 : 4.5}
                  fill="var(--bg-elevated)"
                  stroke={col} strokeWidth={isActive ? 2 : 1.5}
                  style={{
                    opacity:    lineDrawn ? 1 : 0,
                    transition: `all 0.18s ease ${600 + i * 60}ms`,
                    filter:     isActive ? `drop-shadow(0 0 6px ${col})` : "none",
                  }}
                />
                {/* Dot inner fill */}
                <circle cx={p.x} cy={p.y} r={isActive ? 3.5 : 2}
                  fill={col}
                  style={{
                    opacity:    lineDrawn ? 1 : 0,
                    transition: `all 0.18s ease ${600 + i * 60}ms`,
                  }}
                  pointerEvents="none"
                />

                {/* Day label */}
                <text
                  x={p.x} y={H - 6}
                  textAnchor="middle" fontSize="9"
                  fill={isActive ? col : "rgba(255,255,255,0.25)"}
                  fontFamily="monospace"
                  fontWeight={isActive ? "bold" : "normal"}
                  style={{ transition: "fill 0.15s" }}
                >
                  {labels[i]}
                </text>
              </g>
            );
          })}

          {/* Callout pill above active dot */}
          {lineDrawn && (
            <g pointerEvents="none">
              {/* Connecting stem */}
              <line
                x1={activeP.x} y1={pillY + pillH}
                x2={activeP.x} y2={activeP.y - 8}
                stroke={lineColor} strokeWidth="1" opacity="0.4"
              />
              {/* Pill background */}
              <rect
                x={pillX} y={pillY}
                width={pillW} height={pillH} rx="7"
                fill="rgba(10,15,12,0.85)"
                stroke={lineColor} strokeWidth="1"
                style={{ filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.5))" }}
              />
              {/* Day name */}
              <text
                x={pillX + pillW / 2} y={pillY + 11}
                textAnchor="middle" fontSize="7.5"
                fill="rgba(255,255,255,0.45)" fontFamily="monospace"
              >{hovered !== null ? activeL : "Today"}</text>
              {/* PSI value */}
              <text
                x={pillX + pillW / 2} y={pillY + 24}
                textAnchor="middle" fontSize="12"
                fill={lineColor} fontFamily="monospace" fontWeight="bold"
              >{activeV}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}