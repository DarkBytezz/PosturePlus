type Props = {
  psi: number;
};

export default function StatusBadge({ psi }: Props) {
  const status =
    psi >= 80 ? "good" : psi >= 65 ? "warning" : "poor";

  const statusColor =
    status === "good"
      ? "#4CAF82"
      : status === "warning"
      ? "#E9A84C"
      : "#E05B5B";

  const statusLabel =
    status === "good"
      ? "Good Posture"
      : status === "warning"
      ? "Adjust Posture"
      : "Poor Posture";

  return (
    <div
      className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full flex items-center gap-2 z-20"
      style={{
        background: `${statusColor}18`,
        border: `1px solid ${statusColor}40`,
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: statusColor,
          boxShadow: `0 0 6px ${statusColor}`,
        }}
      />
      <span
        className="text-xs font-semibold tracking-wide"
        style={{ color: statusColor }}
      >
        {statusLabel}
      </span>
    </div>
  );
}