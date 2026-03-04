type Zone = "GREEN" | "YELLOW" | "RED";

type ScoreEntry = {
  time: number;
  value: number;
};

export class PSIEngine {
  // ---- Window Durations (seconds) ----
  private window_duration = 60;
  private episode_window = 300;

  // ---- Caps ----
  private variance_cap = 0.18;
  private drift_cap = 0.004;
  private episode_cap = 4;
  private recovery_cap = 20.0;

  // ---- Weights ----
  private w_var = 0.25;
  private w_drift = 0.20;
  private w_density = 0.15;
  private w_recovery = 0.10;

  private quality_cap = 0.35;

  // ---- Rolling Data ----
  public scores: ScoreEntry[] = [];
  private red_episodes: number[] = [];
  private recovery_times: number[] = [];

  private in_red_episode = false;
  private current_red_start: number | null = null;

  // =====================================================

  update(score: number, zone: Zone, timestamp: number): number {
    // Store rolling score
    this.scores.push({ time: timestamp, value: score });

    // Remove old scores
    this.scores = this.scores.filter(
      (s) => timestamp - s.time <= this.window_duration
    );

    // Episode tracking
    this.updateEpisodes(zone, timestamp);

    const var_norm = this.computeVariance();
    const drift_norm = this.computeDrift();
    const density_norm = this.computeEpisodeDensity(timestamp);
    const recovery_norm = this.computeRecovery();
    const quality_norm = this.computeQualityPenalty();

    const quality_score = 1 - quality_norm;

    const stability_penalty =
      this.w_var * var_norm +
      this.w_drift * drift_norm +
      this.w_density * density_norm +
      this.w_recovery * recovery_norm;

    const stability_score = 1 - stability_penalty;

    let psi_raw = quality_score * stability_score;

    // Green stability boost
    if (zone === "GREEN" && quality_norm < 0.2 && var_norm < 0.2) {
      psi_raw = Math.min(psi_raw + 0.02, 1.0);
    }

    return Math.max(0, psi_raw) * 100;
  }

  // =====================================================

  private updateEpisodes(zone: Zone, timestamp: number) {
    if (zone === "RED") {
      if (!this.in_red_episode) {
        this.in_red_episode = true;
        this.current_red_start = timestamp;
      }
    } else {
      if (this.in_red_episode && this.current_red_start !== null) {
        this.in_red_episode = false;

        const recovery_time = timestamp - this.current_red_start;
        this.recovery_times.push(recovery_time);

        // Cap to last 20 recoveries — only recent ones matter for avg
        if (this.recovery_times.length > 20) {
          this.recovery_times = this.recovery_times.slice(-20);
        }

        this.red_episodes.push(timestamp);

        this.current_red_start = null;
      }
    }

    this.red_episodes = this.red_episodes.filter(
      (t) => timestamp - t <= this.episode_window
    );
  }

  // =====================================================

  private computeVariance(): number {
    if (this.scores.length < 5) return 0;

    const values = this.scores.map((s) => s.value);
    const mean =
      values.reduce((sum, v) => sum + v, 0) / values.length;

    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      values.length;

    const std = Math.sqrt(variance);

    return Math.min(std / this.variance_cap, 1.0);
  }

  // =====================================================

  private computeDrift(): number {
    if (this.scores.length < 10) return 0;

    const times = this.scores.map((s) => s.time);
    const values = this.scores.map((s) => s.value);

    const t0 = times[0];
    const normTimes = times.map((t) => t - t0);

    const n = normTimes.length;
    const meanX =
      normTimes.reduce((a, b) => a + b, 0) / n;
    const meanY =
      values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator +=
        (normTimes[i] - meanX) * (values[i] - meanY);
      denominator +=
        (normTimes[i] - meanX) ** 2;
    }

    if (denominator === 0) return 0;

    const slope = numerator / denominator;

    if (slope <= 0) return 0;

    return Math.min(slope / this.drift_cap, 1.0);
  }

  // =====================================================

  private computeEpisodeDensity(timestamp: number): number {
    if (!this.red_episodes.length) return 0;

    const decay_rate = 0.02;

    let weighted_sum = 0;

    for (const episode_time of this.red_episodes) {
      const age = timestamp - episode_time;
      weighted_sum += Math.exp(-decay_rate * age);
    }

    return Math.min(weighted_sum / this.episode_cap, 1.0);
  }

  // =====================================================

  private computeRecovery(): number {
    if (!this.recovery_times.length) return 0;

    const avg =
      this.recovery_times.reduce((a, b) => a + b, 0) /
      this.recovery_times.length;

    return Math.min(avg / this.recovery_cap, 1.0);
  }

  // =====================================================

  private computeQualityPenalty(): number {
    if (this.scores.length < 5) return 0;

    const values = this.scores.map((s) => s.value);
    const mean =
      values.reduce((a, b) => a + b, 0) / values.length;

    return Math.min(mean / this.quality_cap, 1.0);
  }
}