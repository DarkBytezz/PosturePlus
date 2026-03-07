// ── PostureAlerts.ts ──────────────────────────────────────────────────────
// Smart alert engine with repeat beeps, escalation, and per-user settings.

export interface AlertSettings {
  enableSound:         boolean;
  enableNotification:  boolean;
  enableVisualFlash:   boolean;
  repeatIntervalSec:   number;   // 0 = fire once only
  triggerAfterSec:     number;   // seconds in RED before first alert
  escalateAfterSec:    number;   // seconds in RED before escalating beep
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enableSound:         true,
  enableNotification:  true,
  enableVisualFlash:   true,
  repeatIntervalSec:   15,
  triggerAfterSec:     5,
  escalateAfterSec:    30,
};

export class PostureAlerts {
  private settings: AlertSettings;
  private redStartTime:    number | null = null;
  private lastAlertTime:   number | null = null;
  private alertCount       = 0;
  private audioCtx:        AudioContext | null = null;

  // ── Background heartbeat — keeps ticking even when tab is hidden ──────────
  private heartbeatTimer:  ReturnType<typeof setInterval> | null = null;
  private lastKnownZone:   "GREEN" | "YELLOW" | "RED" = "GREEN";

  constructor(settings: AlertSettings = DEFAULT_ALERT_SETTINGS) {
    this.settings = { ...settings };
    this._startHeartbeat();
  }

  updateSettings(s: Partial<AlertSettings>) {
    this.settings = { ...this.settings, ...s };
  }

  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private _startHeartbeat() {
    // Tick every 1s regardless of tab visibility
    // This ensures alerts fire even when requestAnimationFrame is throttled
    this.heartbeatTimer = setInterval(() => {
      if (this.lastKnownZone === "RED" && document.visibilityState !== "visible") {
        this.update(this.lastKnownZone);
      }
    }, 1000);
  }

  update(zone: "GREEN" | "YELLOW" | "RED"): boolean {
    const now = Date.now();
    this.lastKnownZone = zone;

    if (zone !== "RED") {
      this.redStartTime  = null;
      this.lastAlertTime = null;
      this.alertCount    = 0;
      return false;
    }

    if (this.redStartTime === null) this.redStartTime = now;
    const redDurationMs = now - this.redStartTime;
    const triggerMs     = this.settings.triggerAfterSec * 1000;

    if (redDurationMs < triggerMs) return false;

    if (this.lastAlertTime === null) {
      this._fire(redDurationMs);
      this.lastAlertTime = now;
      this.alertCount    = 1;
      return true;
    }

    if (this.settings.repeatIntervalSec === 0) return false;
    const repeatMs    = this.settings.repeatIntervalSec * 1000;
    const sinceLastMs = now - this.lastAlertTime;

    if (sinceLastMs >= repeatMs) {
      this._fire(redDurationMs);
      this.lastAlertTime = now;
      this.alertCount++;
      return true;
    }

    return false;
  }

  getRedStreakMs(): number {
    if (this.redStartTime === null) return 0;
    return Date.now() - this.redStartTime;
  }

  // Called when tab becomes visible — immediate beep if still in RED
  triggerVisibilityBeep() {
    if (this.lastKnownZone !== "RED" || !this.settings.enableSound) return;
    const streak = this.getRedStreakMs();
    const escalated = streak >= this.settings.escalateAfterSec * 1000;
    this._playBeep(escalated);
  }

  private _fire(redDurationMs: number) {
    const escalated = redDurationMs >= this.settings.escalateAfterSec * 1000;
    const isHidden  = document.visibilityState !== "visible";

    // Sound: only when tab is visible (browsers block audio on hidden tabs)
    if (this.settings.enableSound && !isHidden) {
      this._playBeep(escalated);
    }

    // Notification: only when tab is hidden (no point notifying visible user)
    if (this.settings.enableNotification && isHidden) {
      this._sendNotification(escalated, Math.floor(redDurationMs / 1000));
    }
  }

  private _playBeep(escalated: boolean) {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const ctx   = this.audioCtx;
      const beeps = escalated ? 3 : 2;
      const freq  = escalated ? 660 : 520;
      const gap   = escalated ? 0.08 : 0.12;
      const vol   = escalated ? 0.18 : 0.12;

      for (let i = 0; i < beeps; i++) {
        const startAt = ctx.currentTime + i * (0.12 + gap);
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(vol, startAt + 0.02);
        gain.gain.linearRampToValueAtTime(0,   startAt + 0.10);
        osc.start(startAt);
        osc.stop(startAt + 0.12);
      }
    } catch (_) {}
  }

  private _sendNotification(escalated: boolean, secondsInRed: number) {
    if (Notification.permission !== "granted") return;

    const title = escalated
      ? "⚠️ Posture Alert — Check your position"
      : "📐 Posture+ — Correction needed";
    const body = escalated
      ? `Poor posture for ${secondsInRed}s. Please sit up straight.`
      : `Poor posture detected for ${secondsInRed}s.`;

    new Notification(title, {
      body, icon: "/favicon.ico",
      tag: "posture-alert",
      silent: true,
    });
  }

  static async requestPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }
}