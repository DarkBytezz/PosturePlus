import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionSummary {
  durationSec:  number;
  meanPsi:      number;
  minPsi:       number;
  maxPsi:       number;
  psiSlope:     number;
  sdi:          number;
  alerts:       number;
  fatigueFlag:  boolean;
  autoRecalibs: number;
  greenPct:     number;
  yellowPct:    number;
  redPct:       number;
  psiTimeline:  { t: number; psi: number }[];
}

export interface PostureSample {
  sessionId:   string;
  timestamp:   string;
  psi:         number;
  forwardDev:  number;
  lateralDev:  number;
  shoulderDev: number;
  zone:        "GREEN" | "YELLOW" | "RED";
}

// ─── Start Session ────────────────────────────────────────────────────────────

export async function startSession(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id:    userId,
      start_time: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DB] startSession failed:", error.message);
    return null;
  }

  console.log("[DB] Session started:", data.id);
  return data.id;
}

// ─── Save Posture Samples (batch) ─────────────────────────────────────────────

export async function saveSamples(samples: PostureSample[]): Promise<void> {
  if (samples.length === 0) return;

  const rows = samples.map(s => ({
    session_id:   s.sessionId,
    timestamp:    s.timestamp,
    psi:          s.psi,
    forward_dev:  s.forwardDev,
    lateral_dev:  s.lateralDev,
    shoulder_dev: s.shoulderDev,
    zone:         s.zone,
  }));

  const { error } = await supabase
    .from("posture_samples")
    .insert(rows);

  if (error) console.error("[DB] saveSamples failed:", error.message);
}

// ─── End Session ──────────────────────────────────────────────────────────────

export async function endSession(
  sessionId: string,
  summary: SessionSummary
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({
      end_time:         new Date().toISOString(),
      duration_seconds: summary.durationSec,
      mean_psi:         summary.meanPsi,
      min_psi:          summary.minPsi,
      max_psi:          summary.maxPsi,
      psi_slope:        summary.psiSlope,
      sdi:              summary.sdi,
      alerts:           summary.alerts,
      fatigue_flag:     summary.fatigueFlag,
      auto_recalibs:    summary.autoRecalibs,
      green_pct:        summary.greenPct,
      yellow_pct:       summary.yellowPct,
      red_pct:          summary.redPct,
      psi_timeline:     summary.psiTimeline,
    })
    .eq("id", sessionId);

  if (error) console.error("[DB] endSession failed:", error.message);
  else console.log("[DB] Session ended:", sessionId);
}

// ─── Upsert Daily Summary ─────────────────────────────────────────────────────

export async function upsertDailySummary(
  userId: string,
  summary: SessionSummary,
  userTimezone?: string
): Promise<void> {
  // Use user's local date, not UTC
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: userTimezone ?? "UTC",  // en-CA gives YYYY-MM-DD format
  });

  // First read existing row so we can accumulate (not overwrite)
  const { data: existing } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  const prevCount    = existing?.session_count          ?? 0;
  const prevDuration = existing?.total_duration_seconds ?? 0;
  const prevFatigue  = existing?.fatigue_sessions        ?? 0;
  const prevAvgPsi   = existing?.avg_psi                 ?? summary.meanPsi;

  // Rolling average PSI across sessions
  const newCount  = prevCount + 1;
  const newAvgPsi = (prevAvgPsi * prevCount + summary.meanPsi) / newCount;

  const { error } = await supabase
    .from("daily_summaries")
    .upsert({
      user_id:                 userId,
      date:                    today,
      avg_psi:                 Math.round(newAvgPsi * 10) / 10,
      total_duration_seconds:  prevDuration + summary.durationSec,
      session_count:           newCount,
      fatigue_sessions:        prevFatigue + (summary.fatigueFlag ? 1 : 0),
    }, { onConflict: "user_id,date" });

  if (error) console.error("[DB] upsertDailySummary failed:", error.message);
}

// ─── Fetch Sessions (for Reports page) ───────────────────────────────────────

export async function fetchSessions(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB] fetchSessions failed:", error.message);
    return [];
  }

  return data;
}

// ─── Fetch Weekly Summary (for Dashboard chart) ───────────────────────────────

export async function fetchWeeklySummary(userId: string, userTimezone?: string) {
  // Last 7 days in user's local timezone
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: userTimezone ?? "UTC",
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fromDate = sevenDaysAgo.toLocaleDateString("en-CA", {
    timeZone: userTimezone ?? "UTC",
  });

  const { data, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .gte("date", fromDate)
    .lte("date", today)
    .order("date", { ascending: true });

  if (error) {
    console.error("[DB] fetchWeeklySummary failed:", error.message);
    return [];
  }

  return data;
}