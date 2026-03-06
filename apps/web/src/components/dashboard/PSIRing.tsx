import { useEffect, useState } from "react";

type PSIRingProps = {
  value: number | null;
  size?: number; // optional, defaults to 140
};

const PSI_MAX = 100;

export default function PSIRing({ value, size = 140 }: PSIRingProps) {
  const [animated, setAnimated] = useState(false);

  // Clamp value safely
  const hasData = value !== null;

  const safeValue = hasData
    ? Math.max(0, Math.min(PSI_MAX, value))
    : 0;
  // Dynamic sizing
  const strokeWidth = size * 0.043;
  const radius = (size / 2) - strokeWidth;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = animated
    ? (safeValue / PSI_MAX) * circumference
    : 0;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Color thresholds
  const color = !hasData
    ? "var(--text-muted)"
    : safeValue >= 80
      ? "#4CAF82"
      : safeValue >= 60
        ? "#E9A84C"
        : "#E05B5B";
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: size - strokeWidth,
          height: size - strokeWidth,
          border: `1px solid ${color}33`,
        }}
      />

      {/* SVG Ring */}
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-medium)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{
            transition:
              "stroke-dasharray 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>

      {/* Center Text */}
      <div className="absolute flex flex-col items-center">
        <span
          className="font-bold leading-none"
          style={{
            fontSize: size * 0.2,
            fontFamily: "'DM Serif Display', serif",
            color,
          }}
        >
          {hasData ? safeValue : "—"}
        </span>
        <span
          className="text-[9px] tracking-widest uppercase mt-0.5"
          style={{ color: "var(--text-faint)" }}
        >
          PSI Score
        </span>
      </div>
    </div>
  );
}