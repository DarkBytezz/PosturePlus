import React from "react";

function StatCard({
  title,
  value,
  icon,
  delay = 0,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between h-full"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
        animation: `fade-up 0.5s ease ${delay}ms both`,
      }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] opacity-30" style={{ background: "var(--accent-glow)" }} />
      <div className="relative z-10 flex flex-col gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--accent-glow)", color: "var(--accent-secondary)" }}
        >
          {icon}
        </div>
        <p className="text-[11px] tracking-wide uppercase font-medium" style={{ color: "var(--text-faint)" }}>
          {title}
        </p>
        <h4
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif", color: "var(--text-primary)" }}
        >
          {value}
        </h4>
      </div>
    </div>
  );
}

export default StatCard;