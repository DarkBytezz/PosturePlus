import StatCard from "./StatCard";

type StatItem = {
  title: string;
  value: string;
};

type StatsRowProps = {
  stats: StatItem[];
};

export default function StatsRow({ stats }: StatsRowProps) {
  const getIcon = (title: string) => {
    switch (title) {
      case "Today's Duration":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case "Posture Accuracy":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "Correction Alerts":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="grid grid-cols-3 gap-5 flex-shrink-0"
      style={{ height: "160px" }}
    >
      {stats.map((item, index) => (
        <StatCard
          key={index}
          title={item.title}
          value={item.value}
          icon={getIcon(item.title)}
          delay={300 + index * 80}
        />
      ))}
    </div>
  );
}