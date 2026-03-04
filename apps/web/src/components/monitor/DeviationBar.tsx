type Props = {
  label: string
  value: number
  max: number
}

export default function DeviationBar({ label, value, max }: Props) {
  const blocks = 10

  // Normalize value to 0–1 range
  const normalized = Math.min(Math.abs(value) / max, 1)

  // Determine how many blocks to fill
  const filled = Math.ceil(normalized * blocks)

  const bar = Array.from({ length: blocks }, (_, i) =>
    i < filled ? "▰" : "▱"
  ).join("")

  return (
    <div className="space-y-1">
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>

      <div
        className="font-mono text-sm tracking-widest transition-all duration-300"
        style={{ color: "var(--accent-secondary)" }}
      >
        {bar}
      </div>
    </div>
  )
}