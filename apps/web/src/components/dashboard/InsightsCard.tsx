
type InsightItem = {
  icon: string;
  text: string;
  color: string;
};

type InsightsCardProps = {
  insights?: InsightItem[];
  barValues?: number[]; // 0–100 values
};

const DEFAULT_INSIGHTS: InsightItem[] = [
  { icon: "↑", text: "+12% improvement vs last week", color: "#4CAF82" },
  { icon: "⏱", text: "Best streak: 3h 45m", color: "var(--accent-secondary)" },
  { icon: "⚡", text: "Peak corrections at 4–6 PM", color: "#E9A84C" },
  { icon: "✓", text: "7 corrections logged today", color: "var(--text-muted)" },
];

const DEFAULT_BARS = [40, 65, 50, 80, 70, 90, 82];

export default function InsightsCard({
  insights = DEFAULT_INSIGHTS,
  barValues = DEFAULT_BARS,
}: InsightsCardProps) {
  const safeBars = barValues.map((v) => Math.max(0, Math.min(100, v)));

  const latestIndex = safeBars.length - 1;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--accent-glow-strong) 0%, transparent 70%)",
        }}
      />

      <h3
        className="text-base font-semibold mb-4 relative z-10 flex-shrink-0"
        style={{ color: "var(--text-primary)" }}
      >
        Weekly Insights
      </h3>

      {/* Insights List */}
      <div className="space-y-4 relative z-10 flex-1">
        {insights.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] shrink-0 mt-0.5"
              style={{
                background: "var(--bg-secondary)",
                color: item.color,
              }}
            >
              {item.icon}
            </span>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {item.text}
            </p>
          </div>
        ))}
      </div>

      {/* Mini Bar Chart */}
      <div
        className="flex items-end gap-1 mt-5 relative z-10 flex-shrink-0"
        style={{ height: 40 }}
      >
        {safeBars.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: `${(value / 100) * 40}px`,
              background:
                i === latestIndex
                  ? "var(--accent-primary)"
                  : "var(--border-medium)",
            }}
          />
        ))}
      </div>
    </div>
  );
}