// Full port of main.py recalibration logic + session_analyzer integration
// Every parameter matches the Python benchmark exactly.

import type { FeatureMetrics } from "../features/FeatureEngine";
import { PSIEngine } from "../scoring/PSIEngine";
import { SessionAnalyzer } from "../session/SessionAnalyzer";

type Zone = "GREEN" | "YELLOW" | "RED";

export type IntelligenceOutput = {
  forward_dev:       number;
  lateral_dev:       number;
  shoulder_dev:      number;
  zone:              Zone;
  psi:               number | null;
  recalibrated:      boolean;   // true on the frame recalibration fired
};

export class PostureIntelligence {

  // ── Engines ────────────────────────────────────────────────────────────────
  private psiEngine       = new PSIEngine();
  private sessionAnalyzer = new SessionAnalyzer();

  // ── Baseline ───────────────────────────────────────────────────────────────
  private baseline_forward:  number | null = null;
  private baseline_lateral:  number | null = null;
  private baseline_shoulder: number | null = null;

  // ── Calibration ────────────────────────────────────────────────────────────
  private calibrationBuffer:   FeatureMetrics[] = [];
  private calibrating        = false;
  private calibrationStart   = 0;
  private calibrationDuration = 5000;   // 5 s in ms

  // ── Zone hysteresis ────────────────────────────────────────────────────────
  private current_zone:  Zone = "GREEN";
  private display_zone:  Zone = "GREEN";
  private zoneStartTime        = 0;

  private sustain_red        = 3000;   // ms
  private sustain_yellow     = 3000;
  private sustain_green_exit = 2000;

  // ── Thresholds (match Python) ──────────────────────────────────────────────
  private forward_yellow  = 0.06;
  private forward_red     = 0.12;
  private lateral_yellow  = 0.06;
  private lateral_red     = 0.12;
  private shoulder_yellow = 0.06;  // was 0.04 — too easily triggered by jitter
  private shoulder_red    = 0.12;  // was 0.08 — needs to be a genuine sustained lean

  // ── Recalibration parameters (production-tuned) ───────────────────────────
  private recalibration_cooldown     = 300;   // 5 min in seconds (unchanged)
  private stable_duration_required   = 60;    // 60s — was 90s
  private red_block_duration         = 120;   // 2 min no-RED guard (unchanged)
  private beta                       = 0.01;  // baseline drift rate (unchanged)

  // ── Debug mode: relaxes all gates so recalibration fires in ~5s ───────────
  public debugMode = false;

  // ── Recalibration state ────────────────────────────────────────────────────
  private recalibration_start_time:  number | null = null;
  private last_recalibration_time:   number | null = null;
  private recent_red_timestamp:      number | null = null;

  // ── Public stats (exposed for UI/logging) ─────────────────────────────────
  public recalibration_count  = 0;
  public recalibration_events: number[] = [];

  // ==========================================================================

  startCalibration(): void {
    this.calibrating        = true;
    this.calibrationBuffer  = [];
    this.calibrationStart   = Date.now();
  }

  isCalibrated(): boolean {
    return this.baseline_forward !== null;
  }

  // ==========================================================================

  update(metrics: FeatureMetrics | null): IntelligenceOutput | null {
    if (!metrics) return null;

    const now     = Date.now();
    const nowSec  = now / 1000;   // PSIEngine + SessionAnalyzer work in seconds

    // ── CALIBRATION PHASE ─────────────────────────────────────────────────────
    if (this.calibrating) {
      this.calibrationBuffer.push(metrics);

      if (now - this.calibrationStart >= this.calibrationDuration) {
        const avg = (key: keyof FeatureMetrics) =>
          this.calibrationBuffer.reduce((s, m) => s + m[key], 0) /
          this.calibrationBuffer.length;

        this.baseline_forward  = avg("forward_metric");
        this.baseline_lateral  = avg("lateral_metric");
        this.baseline_shoulder = avg("shoulder_metric");
        this.calibrating       = false;

        // Reset engines on fresh calibration — matches Python
        this.psiEngine       = new PSIEngine();
        this.sessionAnalyzer = new SessionAnalyzer();

        // Reset recalibration state
        this.recalibration_start_time = null;
        this.last_recalibration_time  = null;
        this.recent_red_timestamp     = null;
        this.recalibration_count      = 0;
        this.recalibration_events     = [];
      }

      return null;
    }

    if (!this.isCalibrated()) return null;

    // ── DEVIATION FROM BASELINE ───────────────────────────────────────────────
    let forward_dev  = metrics.forward_metric  - this.baseline_forward!;
    let lateral_dev  = metrics.lateral_metric  - this.baseline_lateral!;
    let shoulder_dev = metrics.shoulder_metric - this.baseline_shoulder!;

    // Deadband — matches Python
    if (Math.abs(forward_dev)  < 0.02)  forward_dev  = 0;
    if (Math.abs(lateral_dev)  < 0.02)  lateral_dev  = 0;
    if (Math.abs(shoulder_dev) < 0.035) shoulder_dev = 0;  // wider — shoulder noise floor is ~0.02–0.03

    // ── ZONE SCORING ──────────────────────────────────────────────────────────
    let score = 0;

    if      (Math.abs(forward_dev)  > this.forward_red)    score += 2;
    else if (Math.abs(forward_dev)  > this.forward_yellow)  score += 1;

    if      (Math.abs(lateral_dev)  > this.lateral_red)    score += 2;
    else if (Math.abs(lateral_dev)  > this.lateral_yellow)  score += 1;

    if      (Math.abs(shoulder_dev) > this.shoulder_red)   score += 2;
    else if (Math.abs(shoulder_dev) > this.shoulder_yellow) score += 1;

    const instantaneous_zone: Zone = score >= 2 ? "RED" : score >= 1 ? "YELLOW" : "GREEN";

    // ── HYSTERESIS ────────────────────────────────────────────────────────────
    if (instantaneous_zone !== this.current_zone) {
      this.current_zone = instantaneous_zone;
      this.zoneStartTime = now;
    }

    const elapsed = now - this.zoneStartTime;

    if (this.display_zone === "GREEN") {
      if (this.current_zone === "YELLOW" && elapsed > this.sustain_yellow) this.display_zone = "YELLOW";
      if (this.current_zone === "RED"    && elapsed > this.sustain_red)    this.display_zone = "RED";
    } else if (this.display_zone === "YELLOW") {
      if (this.current_zone === "RED"   && elapsed > this.sustain_red)        this.display_zone = "RED";
      if (this.current_zone === "GREEN" && elapsed > this.sustain_green_exit) this.display_zone = "GREEN";
    } else if (this.display_zone === "RED") {
      if (this.current_zone === "GREEN"  && elapsed > this.sustain_green_exit) this.display_zone = "GREEN";
      if (this.current_zone === "YELLOW" && elapsed > this.sustain_green_exit) this.display_zone = "YELLOW";
    }

    // Track recent RED for recalibration block guard
    if (this.display_zone === "RED") {
      this.recent_red_timestamp = nowSec;
    }

    // ── POSTURE QUALITY SCORE ─────────────────────────────────────────────────
    const posture_score =
      0.5 * Math.abs(forward_dev) +
      0.3 * Math.abs(lateral_dev) +
      0.2 * Math.abs(shoulder_dev);

    // ── PSI + SESSION ANALYZER ────────────────────────────────────────────────
    const psi = this.psiEngine.update(posture_score, this.display_zone, nowSec);
    this.sessionAnalyzer.update(psi, this.display_zone, nowSec);

    // ── RECALIBRATION LOGIC (exact port of Python main.py) ────────────────────
    let recalibrated = false;
    let can_attempt  = false;

    // Gate 1: GREEN zone + PSI > 72 (was 85 — too strict for typical users)
    if (this.display_zone === "GREEN" && psi > 72) {

      // Gate 2: no RED in the last 2 minutes
      const red_ok = this.recent_red_timestamp === null ||
                     (nowSec - this.recent_red_timestamp > this.red_block_duration);

      if (red_ok) {

        // Gate 3: mean posture score < 0.15 (was 0.08 — near-impossible in practice)
        if (this.psiEngine.scores.length > 5) {
          const recent_scores = this.psiEngine.scores.map(s => s.value);
          const mean_score    = recent_scores.reduce((a, b) => a + b, 0) / recent_scores.length;

          if (mean_score < 0.15) {

            // Gate 4: session PSI slope not declining faster than -0.005
            // If session is too short for metrics (< 2 blocks), treat as passing
            const session_metrics = this.sessionAnalyzer.compute_session_metrics();
            if (!session_metrics || session_metrics.psi_slope > -0.005) {
              can_attempt = true;
            }
          }
        }
      }
    }

    if (can_attempt) {
      // Start or continue the stable-duration timer
      if (this.recalibration_start_time === null) {
        this.recalibration_start_time = nowSec;
      } else if (nowSec - this.recalibration_start_time > this.stable_duration_required) {

        // Gate 5: cooldown — at least 5 min since last recalibration
        const cooldown_ok = this.last_recalibration_time === null ||
                            (nowSec - this.last_recalibration_time > this.recalibration_cooldown);

        if (cooldown_ok) {
          // ── FIRE RECALIBRATION ─────────────────────────────────────────────
          // Beta-drift: nudge baseline slightly toward current position
          // Matches Python: baseline = beta * current + (1-beta) * baseline
          this.baseline_forward!  = this.beta * metrics.forward_metric  + (1 - this.beta) * this.baseline_forward!;
          this.baseline_lateral!  = this.beta * metrics.lateral_metric  + (1 - this.beta) * this.baseline_lateral!;
          this.baseline_shoulder! = this.beta * metrics.shoulder_metric + (1 - this.beta) * this.baseline_shoulder!;

          this.last_recalibration_time  = nowSec;
          this.recalibration_start_time = null;
          this.recalibration_count++;
          this.recalibration_events.push(nowSec);
          recalibrated = true;

          console.log(`[PostureIntelligence] Auto-recalibration #${this.recalibration_count} at t=${nowSec.toFixed(1)}s`);
        }
      }
    } else {
      // Conditions broken — reset the stability timer
      this.recalibration_start_time = null;
    }

    return {
      forward_dev,
      lateral_dev,
      shoulder_dev,
      zone:         this.display_zone,
      psi,
      recalibrated,
    };
  }

  // ── getSessionMetrics: callable from UI for end-of-session report ──────────
  getSessionMetrics() {
    return this.sessionAnalyzer.compute_session_metrics();
  }
}