// Posture alert system — beep + browser notification after RED > 5s
// Cooldown prevents spam: min 30s between alerts

export class PostureAlerts {
  private redStartTime:    number | null = null;
  private lastAlertTime:   number | null = null;
  private RED_TRIGGER_MS   = 5000;
  private ALERT_COOLDOWN   = 30000;
  private audioCtx: AudioContext | null = null;

  // Call every frame with current display_zone
  update(zone: string, now = Date.now()): boolean {
    if (zone === "RED") {
      if (this.redStartTime === null) this.redStartTime = now;

      const redDuration = now - this.redStartTime;
      const cooldownOk  = this.lastAlertTime === null ||
                          (now - this.lastAlertTime > this.ALERT_COOLDOWN);

      if (redDuration >= this.RED_TRIGGER_MS && cooldownOk) {
        this.lastAlertTime = now;
        this._fireAlert();
        return true;  // alert fired
      }
    } else {
      this.redStartTime = null;  // reset when zone clears
    }
    return false;
  }

  private _fireAlert() {
    this._beep();
    this._notify();
  }

  // Synthesised double-beep using Web Audio API — no asset needed
  private _beep() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;

      const beep = (startTime: number) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type      = "sine";
        osc.frequency.setValueAtTime(880, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      };

      beep(ctx.currentTime);
      beep(ctx.currentTime + 0.22);
    } catch (_) {
      // Audio not available — silently skip
    }
  }

  // Browser notification — only if permission granted
  private _notify() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification("PosturePlus", {
        body: "Poor posture detected — sit up straight!",
        icon: "/icon.png",
        silent: true,
      });
    }
  }

  // Call once on mount to request notification permission
  static requestPermission() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  // How long current RED streak has been active (0 if not RED)
  getRedStreakMs(now = Date.now()): number {
    return this.redStartTime !== null ? now - this.redStartTime : 0;
  }
}