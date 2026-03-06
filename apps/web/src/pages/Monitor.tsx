import CameraView from "../components/monitor/CameraView";
import BiometricsPanel from "../components/monitor/BiometricsPanel";
import PSITimelineGraph from "../components/monitor/PSITimelineGraph";
import { PostureEngine } from "../pose/engine/PostureEngine";
import { PostureAlerts } from "../pose/alerts/PostureAlerts";
import { PostureInsights } from "../pose/insights/PostureInsights";
import type { InsightMessage } from "../pose/insights/PostureInsights";
import { useEffect, useRef, useCallback, useState } from "react";
import { usePosture } from "../context/PostureContext";

export default function Monitor() {
  const {
    psi, zone, isCalibrated, psiHistory, durationFormatted,
    accuracy, alerts, autoRecalibs,
    greenSeconds, yellowSeconds, redSeconds, totalSeconds, sessionSeconds,
    minPsi, maxPsi, pushLiveData, onCalibrated, onStopped, saveSession,
  } = usePosture();

  const engineRef       = useRef<PostureEngine | null>(null);
  const alertsRef       = useRef<PostureAlerts>(new PostureAlerts());
  const insightsRef     = useRef<PostureInsights>(new PostureInsights());
  const wasCalibratedRef = useRef(false);

  // ── Countdown state ────────────────────────────────────────────────────────
  const [calibrating,    setCalibrating]    = useState(false);
  const [countdown,      setCountdown]      = useState<number | null>(null);

  // ── Display state ──────────────────────────────────────────────────────────
  const [displayPsi,     setDisplayPsi]     = useState<number>(0);
  const [devs,           setDevs]           = useState({ forward: 0, lateral: 0, shoulder: 0 });
  const [recentRecalib,  setRecentRecalib]  = useState(false);
  const [alertActive,    setAlertActive]    = useState(false);
  const [redStreakSec,   setRedStreakSec]    = useState(0);
  const [insights,       setInsights]       = useState<InsightMessage[]>([
    { text: "Start calibration to begin analysis", icon: "🎯", severity: "info" }
  ]);

  // ── Heatmap: rolling severity per axis (0–1) ───────────────────────────────
  const [heatmap, setHeatmap] = useState({ forward: 0, lateral: 0, shoulder: 0 });
  const heatmapRef = useRef({ forward: 0, lateral: 0, shoulder: 0 });

  // ── Session stats ref for cleanup ─────────────────────────────────────────
  const sessionStatsRef = useRef({
    greenSec: 0, yellowSec: 0, redSec: 0, totalSec: 0,
    durationSec: 0, alertCount: 0, recalibCount: 0, minP: 100, maxP: 0,
  });

  useEffect(() => {
    sessionStatsRef.current = {
      greenSec: greenSeconds, yellowSec: yellowSeconds, redSec: redSeconds,
      totalSec: totalSeconds, durationSec: sessionSeconds,
      alertCount: alerts, recalibCount: autoRecalibs, minP: minPsi, maxP: maxPsi,
    };
  }, [greenSeconds, yellowSeconds, redSeconds, totalSeconds, sessionSeconds, alerts, autoRecalibs, minPsi, maxPsi]);

  // ── EMA smooth PSI — seed with first real value, never crawl from 0 ────────
  const displayPsiSeeded = useRef(false);
  useEffect(() => {
    if (psi === 0) return;
    if (!displayPsiSeeded.current) {
      setDisplayPsi(psi);
      displayPsiSeeded.current = true;
    } else {
      setDisplayPsi(prev => 0.15 * psi + 0.85 * prev);
    }
  }, [psi]);

  // ── Request notification permission on mount ──────────────────────────────
  useEffect(() => {
    PostureAlerts.requestPermission();
  }, []);

  // ── Stop engine + save session on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      onStopped();
      const s = sessionStatsRef.current;
      if (wasCalibratedRef.current && s.durationSec > 10) {
        const metrics = engineRef.current?.getSessionMetrics?.();
        saveSession({
          ...s,
          fatigueFlag: metrics?.fatigue_flag ?? false,
          psiSlope:    metrics?.psi_slope ?? 0,
          sdi:         metrics?.stability_degradation_index ?? 0,
        });
        wasCalibratedRef.current = false;
      }
      engineRef.current = null;  // always create fresh engine on next mount
    };
  }, []);

  // ── Engine callback ────────────────────────────────────────────────────────
  const handleEngineData = useCallback((data: {
    psi: number | null;
    zone: "GREEN" | "YELLOW" | "RED";
    forward_dev: number; lateral_dev: number; shoulder_dev: number;
    recalibrated: boolean;
  }) => {
    if (data.psi === null) return;
    console.log(`[Pipeline] PSI=${data.psi.toFixed(1)} zone=${data.zone}`);

    pushLiveData({
      psi: data.psi, zone: data.zone,
      forward_dev: data.forward_dev, lateral_dev: data.lateral_dev,
      shoulder_dev: data.shoulder_dev, recalibrated: data.recalibrated,
    });

    setDevs({ forward: data.forward_dev, lateral: data.lateral_dev, shoulder: data.shoulder_dev });

    // ── Alerts ──────────────────────────────────────────────────────────────
    const fired = alertsRef.current.update(data.zone);
    const streak = alertsRef.current.getRedStreakMs();
    setAlertActive(fired);
    setRedStreakSec(Math.floor(streak / 1000));
    if (fired) setTimeout(() => setAlertActive(false), 2000);

    // ── Heatmap: EMA accumulate severity per axis ───────────────────────────
    const alpha = 0.02;  // slow decay — shows 60s pattern
    const fwdSev = Math.min(Math.abs(data.forward_dev)  / 0.12, 1);
    const latSev = Math.min(Math.abs(data.lateral_dev)  / 0.12, 1);
    const shlSev = Math.min(Math.abs(data.shoulder_dev) / 0.08, 1);
    heatmapRef.current = {
      forward:  alpha * fwdSev + (1 - alpha) * heatmapRef.current.forward,
      lateral:  alpha * latSev + (1 - alpha) * heatmapRef.current.lateral,
      shoulder: alpha * shlSev + (1 - alpha) * heatmapRef.current.shoulder,
    };
    setHeatmap({ ...heatmapRef.current });

    // ── Insights: push sample and recompute every 2s ─────────────────────────
    insightsRef.current.push(data.forward_dev, data.lateral_dev, data.shoulder_dev);

    // ── Recalib toast ────────────────────────────────────────────────────────
    if (data.recalibrated) {
      setRecentRecalib(true);
      setTimeout(() => setRecentRecalib(false), 3000);
    }
  }, [pushLiveData]);

  // Update insights every 2s (not every frame — expensive enough)
  useEffect(() => {
    if (!isCalibrated) return;
    const t = setInterval(() => {
      setInsights(insightsRef.current.compute());
    }, 2000);
    return () => clearInterval(t);
  }, [isCalibrated]);

  // ── Camera ready ──────────────────────────────────────────────────────────
  const handleReady = useCallback(async (
    video: HTMLVideoElement, canvas: HTMLCanvasElement
  ) => {
    if (!engineRef.current) {
      engineRef.current = new PostureEngine(handleEngineData);
      await engineRef.current.attach(video, canvas);
      engineRef.current.start();
    }
  }, [handleEngineData]);

  // ── Calibration with countdown ────────────────────────────────────────────
  const handleCalibration = () => {
    if (!engineRef.current || calibrating) return;

    setCalibrating(true);
    setCountdown(3);

    // Reset heatmap + insights for fresh session
    heatmapRef.current = { forward: 0, lateral: 0, shoulder: 0 };
    setHeatmap({ forward: 0, lateral: 0, shoulder: 0 });
    insightsRef.current = new PostureInsights();
    alertsRef.current   = new PostureAlerts();

    // 3..2..1 countdown, then 5s calibration
    let count = 3;
    const tick = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(tick);
        setCountdown(0);  // "Calibrating…"
        engineRef.current!.startCalibration();

        setTimeout(() => {
          setCalibrating(false);
          setCountdown(null);
          onCalibrated();
          wasCalibratedRef.current = true;
        }, 5000);
      }
    }, 1000);
  };


  return (
    <div className="min-h-[calc(100vh-4.5rem)] p-6 flex gap-6 relative overflow-y-auto">

      {/* ── Recalib toast ───────────────────────────────────────────────────── */}
      {recentRecalib && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{
            background: "var(--status-green-dim)", border: "1px solid var(--status-green-edge)",
            color: "var(--status-green)", backdropFilter: "blur(8px)", boxShadow: "0 0 20px var(--status-green-dim)",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-blink" />
          Baseline auto-recalibrated
        </div>
      )}

      {/* ── Alert flash overlay ─────────────────────────────────────────────── */}
      {alertActive && (
        <div className="absolute inset-0 z-40 pointer-events-none rounded-2xl"
          style={{
            border: "2px solid #ff5f52",
            boxShadow: "inset 0 0 60px rgba(255,95,82,0.12)",
            animation: "pulse 0.4s ease 3",
          }}
        />
      )}

      {/* ── LEFT — camera + timeline graph ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="relative">
          <CameraView onReady={handleReady} zone={zone} />

          {/* ── Calibration countdown overlay ─────────────────────────────── */}
          {calibrating && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl"
              style={{ background: "rgba(5,10,6,0.75)", backdropFilter: "blur(4px)" }}>

              {countdown !== null && countdown > 0 ? (
                <>
                  {/* Animated ring */}
                  <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                    <svg className="absolute inset-0" width="112" height="112" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="50" fill="none"
                        stroke="var(--status-green-dim)" strokeWidth="4" />
                      <circle cx="56" cy="56" r="50" fill="none"
                        stroke="var(--status-green)" strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - countdown / 3)}`}
                        style={{
                          transformOrigin: "56px 56px",
                          transform: "rotate(-90deg)",
                          transition: "stroke-dashoffset 0.9s linear",
                          filter: "drop-shadow(0 0 6px var(--status-green))",
                        }}
                      />
                    </svg>
                    <span className="text-5xl font-bold" style={{
                      fontFamily: "'DM Serif Display', serif", color: "var(--status-green)",
                      filter: "drop-shadow(0 0 12px var(--status-green))",
                    }}>{countdown}</span>
                  </div>
                  <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--status-green)" }}>
                    Sit straight
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Calibration starts in {countdown}s
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "var(--status-green-dim)", border: "1px solid var(--status-green-edge)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="var(--status-green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1 0 10 10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold tracking-widest uppercase" style={{ color: "var(--status-green)" }}>
                    Calibrating…
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Hold still — 5 seconds
                  </p>
                  {/* Progress bar */}
                  <div className="mt-4 w-40 h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full"
                      style={{
                        background: "var(--status-green)",
                        animation: "calibProgress 5s linear forwards",
                      }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Calibrate button ──────────────────────────────────────────────── */}
        <button
          onClick={handleCalibration}
          disabled={calibrating}
          className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
          style={{
            background:  calibrating ? "var(--status-green-dim)" : "var(--accent-primary)",
            color:       calibrating ? "var(--status-green)" : "var(--text-on-accent)",
            border:      calibrating ? "1px solid var(--status-green-edge)" : "none",
            opacity:     calibrating ? 0.8 : 1,
            boxShadow:   calibrating ? "none" : "0 0 20px var(--status-green-edge)",
          }}
        >
          {calibrating
            ? countdown && countdown > 0 ? `Starting in ${countdown}…` : "Calibrating…"
            : isCalibrated ? "↺ Recalibrate" : "Start Calibration"}
        </button>

        <style>{`
          @keyframes calibProgress {
            from { width: 0% }
            to   { width: 100% }
          }
        `}</style>

        {/* ── PSI Timeline Graph ──────────────────────────────────────────── */}
        <PSITimelineGraph
          psiHistory={psiHistory}
          zone={zone}
          isCalibrated={isCalibrated}
        />

      </div>

      {/* ── RIGHT — biometrics panel ─────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <BiometricsPanel
          psi={isCalibrated ? Math.round(displayPsi) : undefined}
          accuracy={accuracy}
          durationFormatted={durationFormatted}
          zone={zone}
          psiHistory={psiHistory}
          forward_dev={devs.forward}
          lateral_dev={devs.lateral}
          shoulder_dev={devs.shoulder}
          heatmap={heatmap}
          insights={insights}
          alertActive={alertActive}
          redStreakSec={redStreakSec}
        />
      </div>

    </div>
  );
}