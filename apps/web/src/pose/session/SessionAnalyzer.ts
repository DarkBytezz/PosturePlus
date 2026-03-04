// Direct port of session_analyzer.py
// Aggregates frame-level data into 10-second blocks, then computes
// session-level metrics used by the recalibration slope guard.

type Zone = "GREEN" | "YELLOW" | "RED";

type BlockData = {
  timestamp:  number;   // seconds
  avg_psi:    number;
  red_ratio:  number;
};

export type SessionMetrics = {
  session_duration_sec:         number;
  mean_psi:                     number;
  psi_slope:                    number;   // used by recalibration guard
  stability_degradation_index:  number;
  total_red_ratio:              number;
  fatigue_flag:                 boolean;
};

export class SessionAnalyzer {
  private aggregation_interval = 10;   // seconds — matches Python

  private last_aggregation_time: number | null = null;
  private buffer: Array<[number, number, Zone]> = [];  // [timestamp, psi, zone]
  private session_data: BlockData[] = [];

  // ── update: called every frame ──────────────────────────────────────────────
  update(psi: number, zone: Zone, timestamp: number): void {
    if (this.last_aggregation_time === null) {
      this.last_aggregation_time = timestamp;
    }

    this.buffer.push([timestamp, psi, zone]);

    if (timestamp - this.last_aggregation_time >= this.aggregation_interval) {
      this._aggregate_block(timestamp);
      this.last_aggregation_time = timestamp;
      this.buffer = [];
    }
  }

  // ── _aggregate_block ─────────────────────────────────────────────────────────
  private _aggregate_block(timestamp: number): void {
    if (this.buffer.length === 0) return;

    const psis  = this.buffer.map(x => x[1]);
    const zones = this.buffer.map(x => x[2]);

    const avg_psi   = psis.reduce((a, b) => a + b, 0) / psis.length;
    const red_ratio = zones.filter(z => z === "RED").length / zones.length;

    this.session_data.push({ timestamp, avg_psi, red_ratio });
  }

  // ── compute_session_metrics ───────────────────────────────────────────────────
  // Returns null when < 2 blocks exist (not enough data yet)
  compute_session_metrics(): SessionMetrics | null {
    if (this.session_data.length < 2) return null;

    const times = this.session_data.map(x => x.timestamp);
    const psis  = this.session_data.map(x => x.avg_psi);

    // Normalize time to start at 0
    const t0               = times[0];
    const norm_times       = times.map(t => t - t0);
    const session_duration = norm_times[norm_times.length - 1];

    // PSI slope via linear regression (polyfit degree 1)
    const psi_slope = this._linear_slope(norm_times, psis);

    // Stability Degradation Index
    const first_block_avg = (psis[0] + (psis[1] ?? psis[0])) / 2;
    const last_block_avg  = (psis[psis.length - 1] + (psis[psis.length - 2] ?? psis[psis.length - 1])) / 2;
    const sdi             = first_block_avg - last_block_avg;

    // Red exposure
    const red_ratios      = this.session_data.map(x => x.red_ratio);
    const total_red_ratio = red_ratios.reduce((a, b) => a + b, 0) / red_ratios.length;

    const mean_psi = psis.reduce((a, b) => a + b, 0) / psis.length;
    // const min_psi  = Math.min(...psis);

    // Fatigue heuristic — matches Python exactly
    const fatigue_flag = psi_slope < -0.01 || sdi > 10 || total_red_ratio > 0.25;

    return {
      session_duration_sec:        +session_duration.toFixed(2),
      mean_psi:                    +mean_psi.toFixed(2),
      psi_slope:                   +psi_slope.toFixed(4),
      stability_degradation_index: +sdi.toFixed(2),
      total_red_ratio:             +total_red_ratio.toFixed(3),
      fatigue_flag,
    };
  }

  // ── reset ─────────────────────────────────────────────────────────────────────
  reset(): void {
    this.last_aggregation_time = null;
    this.buffer                = [];
    this.session_data          = [];
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  // Least-squares linear slope — equivalent to np.polyfit(x, y, 1)[0]
  private _linear_slope(x: number[], y: number[]): number {
    const n    = x.length;
    const mx   = x.reduce((a, b) => a + b, 0) / n;
    const my   = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      den += (x[i] - mx) ** 2;
    }
    return den === 0 ? 0 : num / den;
  }
}