import { useEffect, useRef, useState, useCallback, useMemo } from "react";

type Zone = "GREEN" | "YELLOW" | "RED";

type Props = {
  psiHistory: number[];   // raw array from context — one value every ~3s
  zone:       Zone;
  isCalibrated: boolean;
};

// ── Zone color — reads CSS vars after styles resolve ─────────────────────────
function getZoneColor(zone: Zone): string {
  const style = getComputedStyle(document.documentElement);
  const good    = style.getPropertyValue("--chart-good").trim();
  const caution = style.getPropertyValue("--chart-caution").trim();
  const poor    = style.getPropertyValue("--chart-poor").trim();
  if (zone === "GREEN")  return good    || "#2E7D32";
  if (zone === "YELLOW") return caution || "#B86C10";
  return                        poor    || "#B02A18";
}

// ── Catmull-Rom smooth path ───────────────────────────────────────────────────
function catmullRom(pts: { x: number; y: number }[], T = 0.4): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${p1.x + (p2.x - p0.x) * T},${p1.y + (p2.y - p0.y) * T}`
       + ` ${p2.x - (p3.x - p1.x) * T},${p2.y - (p3.y - p1.y) * T}`
       + ` ${p2.x},${p2.y}`;
  }
  return d;
}

export default function PSITimelineGraph({ psiHistory, zone, isCalibrated }: Props) {
  const svgRef        = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ W: 800, H: 140 });
  const [hovered, setHovered] = useState<{ x: number; y: number; psi: number; t: number } | null>(null);

  // Observe container width
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDims({ W: width, H: 140 });
    });
    ro.observe(svgRef.current.parentElement!);
    return () => ro.disconnect();
  }, []);

  const { W, H } = dims;
  const PAD = { top: 16, bottom: 28, left: 36, right: 16 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Build data points — last 60 samples (~3 min at 3s interval)
  const MAX_POINTS = 60;
  const raw = psiHistory.slice(-MAX_POINTS);

  const toX = (i: number, n: number) =>
    PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const toY = (v: number) =>
    PAD.top + innerH - ((Math.max(0, Math.min(100, v)) / 100) * innerH);

  const pts = raw.map((v, i) => ({ x: toX(i, raw.length), y: toY(v), psi: v }));
  const linePath  = catmullRom(pts);
  const areaPath  = pts.length >= 2
    ? `${linePath} L ${pts[pts.length-1].x},${H - PAD.bottom} L ${pts[0].x},${H - PAD.bottom} Z`
    : "";

  // Recompute color whenever zone changes (also picks up theme switches)
  const lineColor = useMemo(() => getZoneColor(zone), [zone]);

  // Y-axis grid lines at 25 / 50 / 75 / 100
  const gridLines = [25, 50, 75, 100];

  // Hover handler
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (raw.length < 2) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX   = mouseX - PAD.left;
    const idx    = Math.round((relX / innerW) * (raw.length - 1));
    const clamped = Math.max(0, Math.min(raw.length - 1, idx));
    const px = toX(clamped, raw.length);
    const py = toY(raw[clamped]);
    setHovered({ x: px, y: py, psi: raw[clamped], t: clamped * 3 });
  }, [raw, innerW, PAD.left]);

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  // Animate new point — flash the latest dot
  const latestPt = pts[pts.length - 1];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        border:     "1px solid var(--border-subtle)",
        padding:    "0.75rem 0.75rem 0.5rem",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] font-bold"
            style={{ color: "var(--text-muted)" }}>PSI Over Time</span>
          {isCalibrated && (
            <span className="flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: `${lineColor}18`, color: lineColor, border: `1px solid ${lineColor}30` }}>
              <span className="w-1 h-1 rounded-full animate-blink" style={{ background: lineColor }} />
              LIVE
            </span>
          )}
        </div>

        {/* Hover tooltip or latest value */}
        <div className="text-right">
          {hovered ? (
            <span className="text-xs font-mono font-semibold" style={{ color: lineColor }}>
              PSI {hovered.psi} · {Math.floor(hovered.t / 60)}m {hovered.t % 60}s ago
            </span>
          ) : isCalibrated && raw.length > 0 ? (
            <span className="text-xs font-mono font-semibold" style={{ color: lineColor }}>
              {raw[raw.length - 1]} PSI
            </span>
          ) : null}
        </div>
      </div>

      {/* SVG chart */}
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: "block", cursor: raw.length > 0 ? "crosshair" : "default" }}
      >
        <defs>
          {/* Area gradient */}
          <linearGradient id="psi-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>

          {/* Line glow filter */}
          <filter id="psi-glow" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip to chart area */}
          <clipPath id="chart-clip">
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* ── Zone bands (background) ─────────────────────────────────────── */}
        {/* Red zone band: PSI 0–40 */}
        <rect
          x={PAD.left} y={toY(40)} width={innerW} height={toY(0) - toY(40)}
          fill="var(--chart-poor)" fillOpacity="0.07" clipPath="url(#chart-clip)"
        />
        {/* Yellow zone band: PSI 40–70 */}
        <rect
          x={PAD.left} y={toY(70)} width={innerW} height={toY(40) - toY(70)}
          fill="var(--chart-caution)" fillOpacity="0.06" clipPath="url(#chart-clip)"
        />
        {/* Green zone band: PSI 70–100 */}
        <rect
          x={PAD.left} y={toY(100)} width={innerW} height={toY(70) - toY(100)}
          fill="var(--chart-good)" fillOpacity="0.06" clipPath="url(#chart-clip)"
        />

        {/* ── Grid lines ─────────────────────────────────────────────────── */}
        {gridLines.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} y1={toY(v)} x2={PAD.left + innerW} y2={toY(v)}
              stroke="var(--chart-grid)" strokeWidth="1"
              strokeDasharray={v === 100 ? "none" : "3 4"}
            />
            <text
              x={PAD.left - 6} y={toY(v) + 4}
              textAnchor="end" fontSize="8" fontFamily="'DM Mono', monospace"
              fill="var(--chart-text)"
            >{v}</text>
          </g>
        ))}

        {/* Zone threshold labels */}
        <text x={PAD.left + 4} y={toY(70) - 3} fontSize="7"
          fill="var(--chart-caution, rgba(251,191,36,0.7))" fontFamily="monospace">CAUTION</text>
        <text x={PAD.left + 4} y={toY(40) - 3} fontSize="7"
          fill="var(--chart-poor, rgba(255,95,82,0.7))" fontFamily="monospace">POOR</text>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {raw.length === 0 && (
          <>
            <text
              x={W / 2} y={H / 2 - 8}
              textAnchor="middle" fontSize="11" fontFamily="'DM Mono', monospace"
              fill="var(--chart-text)"
            >
              {isCalibrated ? "Collecting data…" : "Calibrate to begin"}
            </text>
            <text
              x={W / 2} y={H / 2 + 10}
              textAnchor="middle" fontSize="8" fontFamily="monospace"
              fill="var(--chart-text)" opacity="0.6"
            >
              {isCalibrated ? "Graph appears after first sample" : "PSI timeline will appear here"}
            </text>
          </>
        )}

        {/* ── Area fill ──────────────────────────────────────────────────── */}
        {areaPath && (
          <path
            d={areaPath}
            fill="url(#psi-area-grad)"
            clipPath="url(#chart-clip)"
          />
        )}

        {/* ── Main line ──────────────────────────────────────────────────── */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#psi-glow)"
            clipPath="url(#chart-clip)"
            style={{ transition: "stroke 0.5s ease" }}
          />
        )}

        {/* ── Hover vertical line + dot ───────────────────────────────────── */}
        {hovered && (
          <>
            <line
              x1={hovered.x} y1={PAD.top}
              x2={hovered.x} y2={H - PAD.bottom}
              stroke="var(--chart-grid)" strokeWidth="1" strokeDasharray="3 3"
            />
            <circle
              cx={hovered.x} cy={hovered.y} r="5"
              fill={lineColor}
              stroke="rgba(0,0,0,0.5)" strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 6px ${lineColor})` }}
            />
            {/* Callout pill */}
            <g>
              <rect
                x={Math.min(hovered.x - 22, W - PAD.right - 44)}
                y={hovered.y - 26}
                width="44" height="18" rx="9"
                fill="var(--bg-elevated)"
                stroke={lineColor} strokeWidth="0.8" strokeOpacity="0.6"
              />
              <text
                x={Math.min(hovered.x, W - PAD.right - 22)}
                y={hovered.y - 13}
                textAnchor="middle" fontSize="9" fontFamily="'DM Mono', monospace"
                fill={lineColor} fontWeight="600"
              >{hovered.psi}</text>
            </g>
          </>
        )}

        {/* ── Live dot (latest point) ─────────────────────────────────────── */}
        {latestPt && isCalibrated && raw.length > 0 && (
          <>
            {/* Pulse ring */}
            <circle
              cx={latestPt.x} cy={latestPt.y} r="8"
              fill="none" stroke={lineColor} strokeWidth="1" strokeOpacity="0.3"
              style={{ animation: "liveDotPulse 2s ease infinite" }}
            />
            <circle
              cx={latestPt.x} cy={latestPt.y} r="4"
              fill={lineColor}
              style={{ filter: `drop-shadow(0 0 5px ${lineColor})` }}
            />
          </>
        )}

        {/* ── X-axis time labels ──────────────────────────────────────────── */}
        {raw.length >= 2 && (() => {
          const totalSec = (raw.length - 1) * 3;
          const labels = [0, 0.25, 0.5, 0.75, 1].map(frac => {
            const sec  = Math.round(totalSec * frac);
            const xpos = PAD.left + frac * innerW;
            const label = sec >= 60
              ? `${Math.floor(sec / 60)}m ${sec % 60}s`
              : `${sec}s`;
            return { xpos, label, sec };
          });
          return labels.map(({ xpos, label }) => (
            <text key={label} x={xpos} y={H - 4}
              textAnchor="middle" fontSize="7.5" fontFamily="'DM Mono', monospace"
              fill="var(--chart-text)"
            >{label}</text>
          ));
        })()}

      </svg>

      <style>{`
        @keyframes liveDotPulse {
          0%, 100% { r: 8; opacity: 0.3; }
          50%       { r: 13; opacity: 0; }
        }
      `}</style>
    </div>
  );
}