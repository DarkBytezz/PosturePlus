type Props = {
  values: number[];      // PSI values 0–100
  zone?: "GREEN" | "YELLOW" | "RED";
};

const ZONE_COLOR: Record<string, string> = {
  GREEN:  "var(--accent-primary,  #4ade80)",
  YELLOW: "var(--accent-gold-bright, #fbbf24)",
  RED:    "var(--accent-danger,   #ff5f52)",
};

// Catmull-Rom → cubic bezier
// Passes through every data point with smooth tangents — no blockiness
function catmullRom(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const tension = 0.35;
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function Sparkline({ values, zone = "GREEN" }: Props) {
  const W         = 220;
  const H         = 90;
  const LEFT_PAD  = 26;   // space for Y-axis labels
  const RIGHT_PAD = 8;
  const TOP_PAD   = 8;
  const BOT_PAD   = 6;

  const chartW = W - LEFT_PAD - RIGHT_PAD;
  const chartH = H - TOP_PAD - BOT_PAD;

  const color  = ZONE_COLOR[zone] ?? ZONE_COLOR.GREEN;
  const gradId = `sg-fill-${zone}`;
  const clipId = `sg-clip-${zone}`;
  const glowId = `sg-glow-${zone}`;

  // ── Placeholder ────────────────────────────────────────────────────────────
  if (!values || values.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {[25, 50, 75].map(pct => (
          <g key={pct}>
            <line
              x1={LEFT_PAD} y1={TOP_PAD + chartH * (1 - pct / 100)}
              x2={LEFT_PAD + chartW} y2={TOP_PAD + chartH * (1 - pct / 100)}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="3 3"
            />
            <text
              x={LEFT_PAD - 4} y={TOP_PAD + chartH * (1 - pct / 100) + 3.5}
              textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="monospace"
            >{pct}</text>
          </g>
        ))}
        <text
          x={LEFT_PAD + chartW / 2} y={H / 2 + 3}
          textAnchor="middle" fontSize="7.5"
          fill="rgba(255,255,255,0.18)" fontFamily="monospace"
        >waiting for data…</text>
      </svg>
    );
  }

  // ── Scale: autoscale viewport around live data, fixed 0–100 axis labels ───
  const dataMin   = Math.min(...values);
  const dataMax   = Math.max(...values);
  const dataRange = dataMax - dataMin;
  const pad       = Math.max(dataRange * 0.30, 5);
  const vMin      = Math.max(0,   dataMin - pad);
  const vMax      = Math.min(100, dataMax + pad);
  const vRange    = vMax - vMin || 1;

  const toX = (i: number) => LEFT_PAD + (i / (values.length - 1)) * chartW;
  const toY = (v: number) => TOP_PAD + chartH - ((v - vMin) / vRange) * chartH;

  const pts      = values.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const linePath = catmullRom(pts);
  const last     = pts[pts.length - 1];
  const first    = pts[0];
  const fillPath = `${linePath} L ${last.x},${TOP_PAD + chartH} L ${first.x},${TOP_PAD + chartH} Z`;

  // ── Y-axis ticks: 3–4 clean values within viewport ───────────────────────
  const tickStep  = dataRange > 15 ? 10 : dataRange > 6 ? 5 : 2;
  const tickStart = Math.ceil(vMin / tickStep) * tickStep;
  const ticks: number[] = [];
  for (let t = tickStart; t <= vMax; t += tickStep) ticks.push(t);

  const currentVal = Math.round(values[values.length - 1]);

  // Pill: flip left if dot is near right edge
  const nearRight  = last.x + 30 > LEFT_PAD + chartW;
  const pillX      = last.x + (nearRight ? -29 : 5);
  const pillTextX  = last.x + (nearRight ? -17 : 17);


  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="75%"  stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>

        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id={clipId}>
          <rect x={LEFT_PAD} y={TOP_PAD} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* ── Vertical axis line ── */}
      <line
        x1={LEFT_PAD} y1={TOP_PAD}
        x2={LEFT_PAD} y2={TOP_PAD + chartH}
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
      />

      {/* ── Grid lines + labels ── */}
      {ticks.map(t => {
        const y          = toY(t);
        const isCurrent  = t === currentVal;
        return (
          <g key={t}>
            <line
              x1={LEFT_PAD} y1={y} x2={LEFT_PAD + chartW} y2={y}
              stroke={isCurrent ? `${color}55` : "rgba(255,255,255,0.07)"}
              strokeWidth="0.5" strokeDasharray="3 3"
            />
            <text
              x={LEFT_PAD - 4} y={y + 3.5}
              textAnchor="end" fontSize="7"
              fill={isCurrent ? color : "rgba(255,255,255,0.28)"}
              fontFamily="monospace"
              fontWeight={isCurrent ? "bold" : "normal"}
            >{t}</text>
          </g>
        );
      })}

      {/* ── Gradient fill ── */}
      <path d={fillPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />

      {/* ── Main line with glow ── */}
      <path
        d={linePath}
        fill="none" stroke={color} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
        filter={`url(#${glowId})`}
      />

      {/* ── Live dot: outer pulse ring + inner filled dot ── */}
      <circle cx={last.x} cy={last.y} r="5"
        fill="none" stroke={color} strokeWidth="0.8" opacity="0.3" />
      <circle cx={last.x} cy={last.y} r="2.4"
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />

      {/* ── Current value pill callout ── */}
      <rect
        x={pillX}
        y={last.y - 9}
        width={24} height={13} rx="3.5"
        fill="rgba(0,0,0,0.6)" stroke={color} strokeWidth="0.6"
      />
      <text
        x={pillTextX}
        y={last.y + 2}
        textAnchor="middle" fontSize="7.5"
        fill={color} fontFamily="monospace" fontWeight="bold"
      >{currentVal}</text>
    </svg>
  );
}