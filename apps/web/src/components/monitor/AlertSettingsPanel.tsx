import type { AlertSettings } from "../../pose/alerts/PostureAlerts";

interface Props {
  settings: AlertSettings;
  onChange: (s: Partial<AlertSettings>) => void;
  onClose: () => void;
}

const REPEAT_OPTIONS = [
  { label: "Once only", value: 0 },
  { label: "Every 10s", value: 10 },
  { label: "Every 15s", value: 15 },
  { label: "Every 30s", value: 30 },
  { label: "Every 60s", value: 60 },
];

const TRIGGER_OPTIONS = [
  { label: "3 seconds", value: 3 },
  { label: "5 seconds", value: 5 },
  { label: "10 seconds", value: 10 },
  { label: "15 seconds", value: 15 },
];

export default function AlertSettingsPanel({ settings, onChange, onClose }: Props) {
  return (
    <div style={{
      position: "absolute",
      top: "110%",
      right: 0,
      zIndex: 100,

      width: "300px",
      maxHeight: "60vh",
      overflowY: "auto",

      background: "var(--bg-elevated)",
      border: "1px solid var(--border-medium)",
      borderRadius: "16px",
      padding: "1.25rem",
      boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Alert Settings
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "1px" }}>
            Customise how Posture+ alerts you
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "transparent", border: "none",
          color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", padding: "2px",
        }}>✕</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Toggle rows */}
        {([
          { key: "enableSound", label: "🔔 Sound beeps", desc: "Soft beep when bad posture detected" },
          { key: "enableNotification", label: "📱 Browser notifications", desc: "Alert when you're on another tab" },
          { key: "enableVisualFlash", label: "⚡ Visual flash", desc: "Red border flash on the monitor page" },
        ] as { key: keyof AlertSettings; label: string; desc: string }[]).map(row => (
          <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-primary)" }}>{row.label}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "1px" }}>{row.desc}</div>
            </div>
            <Toggle
              value={settings[row.key] as boolean}
              onChange={v => onChange({ [row.key]: v })}
            />
          </div>
        ))}

        <div style={{ height: "1px", background: "var(--border-subtle)" }} />

        {/* Trigger delay */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Alert after being in RED for…
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {TRIGGER_OPTIONS.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                active={settings.triggerAfterSec === o.value}
                onClick={() => onChange({ triggerAfterSec: o.value })}
              />
            ))}
          </div>
        </div>

        {/* Repeat interval */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Repeat alerts while in RED…
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {REPEAT_OPTIONS.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                active={settings.repeatIntervalSec === o.value}
                onClick={() => onChange({ repeatIntervalSec: o.value })}
              />
            ))}
          </div>
        </div>

        {/* Mode summary */}
        <div style={{
          background: "var(--accent-glow)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px", padding: "0.65rem 0.85rem",
        }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {!settings.enableSound && !settings.enableNotification && !settings.enableVisualFlash
              ? "⚪ Silent mode — tracking only, no interruptions."
              : settings.repeatIntervalSec === 0
                ? "🔕 Single alert only — you'll be notified once per RED episode."
                : `🔁 Repeating every ${settings.repeatIntervalSec}s in RED. Escalates after ${settings.escalateAfterSec}s.`
            }
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: "38px", height: "22px", borderRadius: "100px",
        background: value ? "var(--accent-primary)" : "var(--border-medium)",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
        boxShadow: value ? "0 0 8px var(--accent-glow-strong)" : "none",
      }}
    >
      <span style={{
        position: "absolute", top: "3px",
        left: value ? "19px" : "3px",
        width: "16px", height: "16px", borderRadius: "50%",
        background: "white",
        transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.3rem 0.65rem", borderRadius: "100px",
        fontSize: "0.7rem", fontWeight: 500, cursor: "pointer",
        border: active ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
        background: active ? "var(--accent-glow)" : "transparent",
        color: active ? "var(--accent-primary)" : "var(--text-muted)",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}