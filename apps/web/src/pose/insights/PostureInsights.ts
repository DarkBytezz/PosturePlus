// Smart posture insights — pattern detection from rolling deviation history
// Generates human-readable coaching messages based on what's actually happening

export type InsightMessage = {
  text:     string;
  icon:     string;
  severity: "info" | "warn" | "good";
};

type DeviationSample = {
  forward:  number;
  lateral:  number;
  shoulder: number;
  ts:       number;
};

export class PostureInsights {
  private samples: DeviationSample[] = [];
  private readonly WINDOW_SEC = 60;       // analyse last 60s
  private readonly MIN_SAMPLES = 10;      // need at least this many to draw conclusions

  push(forward: number, lateral: number, shoulder: number, now = Date.now()) {
    this.samples.push({ forward, lateral, shoulder, ts: now });

    // Trim to window
    const cutoff = now - this.WINDOW_SEC * 1000;
    this.samples = this.samples.filter(s => s.ts >= cutoff);
  }

  // Returns up to 3 insight messages — most relevant first
  compute(): InsightMessage[] {
    if (this.samples.length < this.MIN_SAMPLES) {
      return [{ text: "Gathering posture data…", icon: "⏳", severity: "info" }];
    }

    const n         = this.samples.length;
    const fwdVals   = this.samples.map(s => s.forward);
    const latVals   = this.samples.map(s => s.lateral);
    const shlVals   = this.samples.map(s => s.shoulder);

    const mean  = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const pctAbove = (arr: number[], threshold: number) =>
      arr.filter(v => Math.abs(v) > threshold).length / arr.length;

    const fwdMean    = mean(fwdVals.map(Math.abs));
    const latMean    = mean(latVals.map(Math.abs));
    const shlMean    = mean(shlVals.map(Math.abs));

    const fwdFreq    = pctAbove(fwdVals, 0.06);   // % frames in yellow+ forward
    const latFreq    = pctAbove(latVals, 0.06);
    const shlFreq    = pctAbove(shlVals, 0.04);

    const fwdSevere  = pctAbove(fwdVals, 0.12);   // % frames in red forward
    const latSevere  = pctAbove(latVals, 0.12);
    const shlSevere  = pctAbove(shlVals, 0.08);

    // Trend: is forward lean getting worse over time?
    const firstHalf  = fwdVals.slice(0, Math.floor(n / 2)).map(Math.abs);
    const secondHalf = fwdVals.slice(Math.floor(n / 2)).map(Math.abs);
    const drifting   = mean(secondHalf) > mean(firstHalf) * 1.25;

    const messages: InsightMessage[] = [];

    // ── Forward head posture ───────────────────────────────────────────────
    if (fwdSevere > 0.4) {
      messages.push({ text: "Severe forward head posture detected", icon: "⚠️", severity: "warn" });
    } else if (fwdFreq > 0.5) {
      messages.push({ text: "Forward head posture detected frequently", icon: "↗", severity: "warn" });
    } else if (drifting && fwdMean > 0.03) {
      messages.push({ text: "Posture gradually drifting forward", icon: "📉", severity: "warn" });
    }

    // ── Lateral tilt ──────────────────────────────────────────────────────
    if (latSevere > 0.3) {
      messages.push({ text: "Significant head tilt — check monitor height", icon: "↔", severity: "warn" });
    } else if (latFreq > 0.4) {
      messages.push({ text: "Frequent lateral head tilt detected", icon: "↔", severity: "warn" });
    }

    // ── Shoulder imbalance ────────────────────────────────────────────────
    if (shlSevere > 0.35) {
      messages.push({ text: "Shoulder imbalance — check armrest height", icon: "⚖", severity: "warn" });
    } else if (shlFreq > 0.45) {
      messages.push({ text: "Uneven shoulders detected frequently", icon: "⚖", severity: "warn" });
    }

    // ── Positive feedback ─────────────────────────────────────────────────
    if (messages.length === 0) {
      if (fwdMean < 0.02 && latMean < 0.02 && shlMean < 0.015) {
        messages.push({ text: "Excellent posture — keep it up!", icon: "✓", severity: "good" });
      } else {
        messages.push({ text: "Good posture overall this minute", icon: "✓", severity: "good" });
      }
    }

    // ── Dominant axis ─────────────────────────────────────────────────────
    const worst = [
      { axis: "forward lean",         score: fwdMean,  freq: fwdFreq  },
      { axis: "lateral tilt",         score: latMean,  freq: latFreq  },
      { axis: "shoulder imbalance",   score: shlMean,  freq: shlFreq  },
    ].sort((a, b) => b.score - a.score)[0];

    if (worst.freq > 0.3 && messages.length < 3) {
      messages.push({
        text:     `Primary issue: ${worst.axis}`,
        icon:     "🎯",
        severity: "info",
      });
    }

    return messages.slice(0, 3);
  }
}