import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import {
  startSession      as dbStartSession,
  saveSamples       as dbSaveSamples,
  endSession        as dbEndSession,
  upsertDailySummary,
  fetchWeeklySummary,
  fetchSessions,
  type PostureSample,
} from "../lib/postureDb";

export type Zone = "GREEN" | "YELLOW" | "RED";

export type LivePostureData = {
  psi: number;
  zone: Zone;
  forward_dev: number;
  lateral_dev: number;
  shoulder_dev: number;
  recalibrated: boolean;
};

export type SessionRecord = {
  id:              string;
  date:            string;          // display string e.g. "Wed, Mar 4"
  startTimestamp:  number;          // Date.now() at calibration
  durationSec:     number;
  meanPsi:         number;
  minPsi:          number;
  maxPsi:          number;
  accuracy:        number;          // % green time
  alerts:          number;          // RED zone entries
  autoRecalibs:    number;
  greenPct:        number;          // 0–100
  yellowPct:       number;
  redPct:          number;
  psiTimeline:     number[];        // sampled PSI values for mini sparkline
  fatigueFlag:     boolean;
  psiSlope:        number;
  sdi:             number;          // stability degradation index
};

export function usePostureStream() {
  const { user } = useAuth();

  // ── Load persisted data from Supabase on mount ─────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Load last 7 days for dashboard chart
    fetchWeeklySummary(user.id, user.user_metadata?.timezone).then(rows => {
      if (!rows.length) return;

      // Build 7-slot array — today is slot 6, 6 days ago is slot 0
      const slots = [0, 0, 0, 0, 0, 0, 0];
      const today = new Date();

      rows.forEach(row => {
        const rowDate  = new Date(row.date);
        const diffDays = Math.round(
          (today.setHours(0,0,0,0) - rowDate.setHours(0,0,0,0)) / 86400000
        );
        const slot = 6 - diffDays;
        if (slot >= 0 && slot <= 6) slots[slot] = Math.round(row.avg_psi ?? 0);
      });

      setWeeklyData(slots);
    });

    // Load session history for Reports page
    fetchSessions(user.id, 20).then(rows => {
      if (!rows.length) return;

      const records: SessionRecord[] = rows.map(r => ({
        id:             r.id,
        date:           new Date(r.start_time).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        }),
        startTimestamp: new Date(r.start_time).getTime(),
        durationSec:    r.duration_seconds ?? 0,
        meanPsi:        Math.round(r.mean_psi ?? 0),
        minPsi:         Math.round(r.min_psi  ?? 0),
        maxPsi:         Math.round(r.max_psi  ?? 0),
        accuracy:       Math.round(r.green_pct ?? 0),
        alerts:         r.alerts        ?? 0,
        autoRecalibs:   r.auto_recalibs ?? 0,
        greenPct:       Math.round(r.green_pct  ?? 0),
        yellowPct:      Math.round(r.yellow_pct ?? 0),
        redPct:         Math.round(r.red_pct    ?? 0),
        psiTimeline:    (r.psi_timeline ?? []).map((p: { psi: number }) => p.psi),
        fatigueFlag:    r.fatigue_flag  ?? false,
        psiSlope:       r.psi_slope     ?? 0,
        sdi:            r.sdi           ?? 0,
      }));

      setSessionHistory(records);
    });

  }, [user]);

  // ── Live engine state ──────────────────────────────────────────────────────
  const [psi,          setPsi]          = useState<number>(0);
  const [zone,         setZone]         = useState<Zone>("GREEN");
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isActive,     setIsActive]     = useState(false);

  // ── Session stats ──────────────────────────────────────────────────────────
  const [sessionSeconds,  setSessionSeconds]  = useState(0);
  const [alerts,          setAlerts]          = useState(0);
  const [autoRecalibs,    setAutoRecalibs]    = useState(0);
  const [greenSeconds,    setGreenSeconds]    = useState(0);
  const [yellowSeconds,   setYellowSeconds]   = useState(0);
  const [redSeconds,      setRedSeconds]      = useState(0);
  const [totalSeconds,    setTotalSeconds]    = useState(0);
  const [minPsi,          setMinPsi]          = useState(100);
  const [maxPsi,          setMaxPsi]          = useState(0);

  // ── PSI history ────────────────────────────────────────────────────────────
  const [psiHistory,      setPsiHistory]      = useState<number[]>([]);
  const [weeklyData,      setWeeklyData]      = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // ── Session history (persisted across sessions in memory) ─────────────────
  const [sessionHistory,  setSessionHistory]  = useState<SessionRecord[]>([]);

  // ── Internal refs ──────────────────────────────────────────────────────────
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastZoneRef       = useRef<Zone>("GREEN");
  const currentZoneRef    = useRef<Zone>("GREEN");
  const psiSnapshotRef    = useRef<number>(0);
  const sessionStartRef   = useRef<number>(0);
  const psiTimelineRef    = useRef<number[]>([]);

  // ── DB refs ────────────────────────────────────────────────────────────────
  const dbSessionIdRef    = useRef<string | null>(null);
  const sampleBufferRef   = useRef<PostureSample[]>([]);
  const dbFlushTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestDevsRef     = useRef({ forward: 0, lateral: 0, shoulder: 0, zone: "GREEN" as Zone });

  // ── Called every engine frame ──────────────────────────────────────────────
  const pushLiveData = useCallback((data: LivePostureData) => {
    setPsi(data.psi);
    setZone(data.zone);
    currentZoneRef.current = data.zone;
    psiSnapshotRef.current = data.psi;

    // Track latest deviations for 5s sample flush
    latestDevsRef.current = {
      forward:  data.forward_dev,
      lateral:  data.lateral_dev,
      shoulder: data.shoulder_dev,
      zone:     data.zone,
    };

    if (data.zone === "RED" && lastZoneRef.current !== "RED") {
      setAlerts(prev => prev + 1);
    }
    lastZoneRef.current = data.zone;

    if (data.recalibrated) {
      setAutoRecalibs(prev => prev + 1);
    }

    setMinPsi(prev => Math.min(prev, Math.round(data.psi)));
    setMaxPsi(prev => Math.max(prev, Math.round(data.psi)));
  }, []);

  // ── Called when calibration completes ─────────────────────────────────────
  const onCalibrated = useCallback(async () => {
    setIsCalibrated(true);
    setIsActive(true);

    sessionStartRef.current  = Date.now();
    psiTimelineRef.current   = [];
    sampleBufferRef.current  = [];

    setSessionSeconds(0);
    setAlerts(0);
    setAutoRecalibs(0);
    setGreenSeconds(0);
    setYellowSeconds(0);
    setRedSeconds(0);
    setTotalSeconds(0);
    setMinPsi(100);
    setMaxPsi(0);
    setPsiHistory([]);
    lastZoneRef.current    = "GREEN";
    currentZoneRef.current = "GREEN";

    // ── Start DB session ───────────────────────────────────────────────────
    if (user) {
      const sessionId = await dbStartSession(user.id);
      dbSessionIdRef.current = sessionId;
    }

    // Session timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
      setTotalSeconds(prev => prev + 1);
      const z = currentZoneRef.current;
      if      (z === "GREEN")  setGreenSeconds( prev => prev + 1);
      else if (z === "YELLOW") setYellowSeconds(prev => prev + 1);
      else if (z === "RED")    setRedSeconds(   prev => prev + 1);
    }, 1000);

    // PSI sampler every 3s (for sparkline)
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    sampleTimerRef.current = setInterval(() => {
      const snap = Math.round(psiSnapshotRef.current);
      if (snap === 0) return;

      psiTimelineRef.current = [...psiTimelineRef.current, snap];

      setPsiHistory(prev => {
        const next = [...prev, snap];
        return next.length > 120 ? next.slice(-120) : next;
      });

      setWeeklyData(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = snap;
        return updated;
      });
    }, 3000);

    // ── DB sample buffer — collect every 5s then flush ─────────────────────
    if (dbFlushTimerRef.current) clearInterval(dbFlushTimerRef.current);
    dbFlushTimerRef.current = setInterval(() => {
      const sessionId = dbSessionIdRef.current;
      const psi       = psiSnapshotRef.current;
      if (!sessionId || psi === 0) return;

      const { forward, lateral, shoulder, zone } = latestDevsRef.current;

      // Add sample to buffer
      sampleBufferRef.current.push({
        sessionId,
        timestamp:   new Date().toISOString(),
        psi:         Math.round(psi * 10) / 10,
        forwardDev:  Math.round(forward  * 1000) / 1000,
        lateralDev:  Math.round(lateral  * 1000) / 1000,
        shoulderDev: Math.round(shoulder * 1000) / 1000,
        zone,
      });

      // Flush every 6 samples (~30s) to avoid hammering Supabase
      if (sampleBufferRef.current.length >= 6) {
        dbSaveSamples([...sampleBufferRef.current]);
        sampleBufferRef.current = [];
      }
    }, 5000);

  }, [user]);

  // ── Save completed session to history ─────────────────────────────────────
  const saveSession = useCallback((opts: {
    durationSec:  number;
    greenSec:     number;
    yellowSec:    number;
    redSec:       number;
    totalSec:     number;
    alertCount:   number;
    recalibCount: number;
    minP:         number;
    maxP:         number;
    fatigueFlag:  boolean;
    psiSlope:     number;
    sdi:          number;
  }) => {
    const timeline = psiTimelineRef.current;
    const meanPsi  = timeline.length > 0
      ? Math.round(timeline.reduce((a, b) => a + b, 0) / timeline.length)
      : 0;

    const total    = opts.totalSec || 1;
    const greenPct  = Math.round((opts.greenSec  / total) * 100);
    const yellowPct = Math.round((opts.yellowSec / total) * 100);
    const redPct    = Math.round((opts.redSec    / total) * 100);
    const accuracy  = greenPct;

    const record: SessionRecord = {
      id:             `session-${sessionStartRef.current}`,
      date:           new Date(sessionStartRef.current).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      }),
      startTimestamp: sessionStartRef.current,
      durationSec:    opts.durationSec,
      meanPsi,
      minPsi:         opts.minP,
      maxPsi:         opts.maxP,
      accuracy,
      alerts:         opts.alertCount,
      autoRecalibs:   opts.recalibCount,
      greenPct,
      yellowPct,
      redPct,
      psiTimeline:    timeline.slice(-40),
      fatigueFlag:    opts.fatigueFlag,
      psiSlope:       opts.psiSlope,
      sdi:            opts.sdi,
    };

    setSessionHistory(prev => [record, ...prev].slice(0, 20));

    // ── Flush remaining samples + persist to Supabase ──────────────────────
    if (user && dbSessionIdRef.current) {
      const sessionId = dbSessionIdRef.current;

      // Flush any remaining buffered samples
      if (sampleBufferRef.current.length > 0) {
        dbSaveSamples([...sampleBufferRef.current]);
        sampleBufferRef.current = [];
      }

      const summary = {
        durationSec:  opts.durationSec,
        meanPsi,
        minPsi:       opts.minP,
        maxPsi:       opts.maxP,
        psiSlope:     opts.psiSlope,
        sdi:          opts.sdi,
        alerts:       opts.alertCount,
        fatigueFlag:  opts.fatigueFlag,
        autoRecalibs: opts.recalibCount,
        greenPct,
        yellowPct,
        redPct,
        psiTimeline:  timeline.slice(-40).map((psi, i) => ({ t: i * 3, psi })),
      };

      dbEndSession(sessionId, summary);
      upsertDailySummary(user.id, summary, user.user_metadata?.timezone).then(() => {
        // Refresh weekly chart after session saved
        fetchWeeklySummary(user.id, user.user_metadata?.timezone).then(rows => {
          if (!rows.length) return;
          const slots = [0, 0, 0, 0, 0, 0, 0];
          const today = new Date();
          rows.forEach(row => {
            const rowDate  = new Date(row.date);
            const diffDays = Math.round(
              (today.setHours(0,0,0,0) - rowDate.setHours(0,0,0,0)) / 86400000
            );
            const slot = 6 - diffDays;
            if (slot >= 0 && slot <= 6) slots[slot] = Math.round(row.avg_psi ?? 0);
          });
          setWeeklyData(slots);
        });
      });
      dbSessionIdRef.current = null;
    }
  }, [user]);

  // ── Called on unmount / stop ───────────────────────────────────────────────
  const onStopped = useCallback(() => {
    if (timerRef.current)       clearInterval(timerRef.current);
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    if (dbFlushTimerRef.current) clearInterval(dbFlushTimerRef.current);
    setIsActive(false);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const accuracy = totalSeconds > 0
    ? Math.round((greenSeconds / totalSeconds) * 100)
    : 0;

  const durationFormatted = (() => {
    const h = Math.floor(sessionSeconds / 3600);
    const m = Math.floor((sessionSeconds % 3600) / 60);
    const s = sessionSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return sessionSeconds > 0 ? `${s}s` : "--";
  })();

  const stats = [
    { title: "Today's Duration",  value: durationFormatted },
    { title: "Posture Accuracy",  value: isCalibrated ? `${accuracy}%` : "--" },
    { title: "Correction Alerts", value: isCalibrated ? alerts.toString() : "--" },
  ];

  return {
    psi, zone, isCalibrated, isActive,
    weeklyData, psiHistory, stats,
    accuracy, alerts, autoRecalibs, durationFormatted,
    minPsi, maxPsi,
    greenSeconds, yellowSeconds, redSeconds, totalSeconds, sessionSeconds,
    sessionHistory,
    pushLiveData, onCalibrated, onStopped, saveSession,
  };
}