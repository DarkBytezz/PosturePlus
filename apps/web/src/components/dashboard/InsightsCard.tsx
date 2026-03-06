type InsightItem = {
  icon: string;
  text: string;
  color: string;
};

type InsightsCardProps = {
  insights?: InsightItem[];
  barValues?: (number | null)[];
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function deriveWeeklyInsights(bars: (number | null)[]): InsightItem[] {
  const hasData = bars.some(v => v !== null && v > 0);
  if (!hasData) return [];

  const items: InsightItem[] = [];
  const nonZero = bars.filter((v): v is number => v !== null && v > 0);
  const avg = Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length);

  items.push({
    icon: avg >= 80 ? "✓" : avg >= 60 ? "~" : "↓",
    text: `Weekly avg PSI: ${avg} — ${avg >= 80 ? "great week" : avg >= 60 ? "room to improve" : "needs attention"}`,
    color: avg >= 80 ? "#4CAF82" : avg >= 60 ? "#E9A84C" : "var(--accent-danger)",
  });

  const numericBars = bars.filter((v): v is number => v !== null);
  const bestVal = numericBars.length ? Math.max(...numericBars) : 0;
  const bestIdx = bars.lastIndexOf(bestVal);
  if (bestVal > 0) {
    const today = new Date();
    const dayLabel = bestIdx === 6 ? "Today" : DAYS[(today.getDay() - 1 + bestIdx - (bars.length - 1) + 14) % 7] ?? `Day ${bestIdx + 1}`;
    items.push({
      icon: "★",
      text: `Best day: ${dayLabel} with PSI ${bestVal}`,
      color: "var(--accent-gold-bright)",
    });
  }

  let streak = 0;
  for (let i = bars.length - 1; i >= 0; i--) {
    const v = bars[i];
    if (v !== null && v > 0) streak++;
    else break;
  }
  if (streak > 1) {
    items.push({
      icon: "↑",
      text: `${streak}-day active streak`,
      color: "#E9A84C",
    });
  }

  const firstHalf = bars.slice(0, 3).filter((v): v is number => v !== null && v > 0)
  const secondHalf = bars.slice(4).filter((v): v is number => v !== null && v > 0)
  if (firstHalf.length && secondHalf.length) {
    const diff = Math.round(
      secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length -
      firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    );
    if (Math.abs(diff) >= 3) {
      items.push({
        icon: diff > 0 ? "↑" : "↓",
        text: diff > 0 ? `Trending up +${diff} pts vs earlier this week` : `Trending down ${diff} pts vs earlier this week`,
        color: diff > 0 ? "#4CAF82" : "var(--accent-danger)",
      });
    }
  }

  return items.slice(0, 4);
}

export default function InsightsCard({
  insights,
  barValues = [null, null, null, null, null, null, null]
}: InsightsCardProps) {
  const safeBars = barValues.map((v) => v === null ? 0 : Math.max(0, Math.min(100, v)));
  const latestIndex = safeBars.length - 1;
  const hasData = safeBars.some(v => v > 0);

  const derivedWeekly = deriveWeeklyInsights(safeBars);
  const displayInsights = insights ?? (hasData ? derivedWeekly : null);

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
        style={{ background: "radial-gradient(circle, var(--accent-glow-strong) 0%, transparent 70%)" }}
      />

      <h3
        className="text-base font-semibold mb-4 relative z-10 flex-shrink-0"
        style={{ color: "var(--text-primary)" }}
      >
        {insights ? "Session Insights" : "Weekly Insights"}
      </h3>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {displayInsights && displayInsights.length > 0 ? (
          <div className="space-y-4">
            {displayInsights.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] shrink-0 mt-0.5"
                  style={{ background: "var(--bg-secondary)", color: item.color }}
                >
                  {item.icon}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-4">
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                No sessions yet
              </p>
              <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--text-faint)" }}>
                Complete a session in Monitor<br />to see insights here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mini Bar Chart */}
      <div className="flex items-end gap-1 mt-5 relative z-10 flex-shrink-0" style={{ height: 40 }}>
        {safeBars.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: value > 0 ? `${(value / 100) * 40}px` : "3px",
              background: i === latestIndex && value > 0
                ? "var(--accent-primary)"
                : value > 0
                  ? "var(--border-medium)"
                  : "var(--border-subtle)",
              opacity: value > 0 ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}