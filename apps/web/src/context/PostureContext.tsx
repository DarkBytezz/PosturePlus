// PostureContext.tsx
//
// Engine, camera, and PiP all live here — outside any page component.
// Navigating to Dashboard/Reports does NOT kill the engine.
// Monitor.tsx is pure UI — it just reads from context and calls startEngine/stopEngine.

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from "react";
import { PostureEngine } from "../pose/engine/PostureEngine";
import { PostureAlerts } from "../pose/alerts/PostureAlerts";
import { PostureInsights } from "../pose/insights/PostureInsights";
import type { InsightMessage } from "../pose/insights/PostureInsights";
import type { AlertSettings } from "../pose/alerts/PostureAlerts";
import { DEFAULT_ALERT_SETTINGS } from "../pose/alerts/PostureAlerts";
import { usePostureStream } from "../hooks/usePostureStream";
import { usePiP } from "../hooks/usePiP";

export type EngineStatus = "idle" | "starting" | "running" | "stopped";

// Named alias — locks ReturnType inference across module boundaries.
// Without this, TS collapses indexed ReturnType lookups to `any` in generics.
type PostureStream = ReturnType<typeof usePostureStream>;

type PostureContextType = {
  // ── From usePostureStream ─────────────────────────────────────────────────
  psi:               number;
  zone:              "GREEN" | "YELLOW" | "RED";
  isCalibrated:      boolean;
  isActive:          boolean;
  psiHistory:        number[];
  weeklyData:        (number | null)[];
  sessionHistory:    PostureStream["sessionHistory"];
  stats:             PostureStream["stats"];
  accuracy:          number;
  alerts:            number;
  autoRecalibs:      number;
  durationFormatted: string;
  minPsi:            number;
  maxPsi:            number;
  greenSeconds:      number;
  yellowSeconds:     number;
  redSeconds:        number;
  totalSeconds:      number;
  sessionSeconds:    number;
  pushLiveData:      PostureStream["pushLiveData"];
  onCalibrated:      PostureStream["onCalibrated"];
  onStopped:         PostureStream["onStopped"];
  saveSession:       PostureStream["saveSession"];
  // ── Engine control ────────────────────────────────────────────────────────
  engineStatus:       EngineStatus;
  startEngine:        () => Promise<void>;
  stopEngine:         () => void;
  triggerCalibration: () => void;
  canvasRef:          React.RefObject<HTMLCanvasElement | null>;
  camGranted:         boolean;
  devs:               { forward: number; lateral: number; shoulder: number };
  heatmap:            { forward: number; lateral: number; shoulder: number };
  displayPsi:         number;
  alertActive:        boolean;
  redStreakSec:       number;
  recentRecalib:      boolean;
  insights:           InsightMessage[];
  countdown:          number | null;
  calibrating:        boolean;
  alertSettings:      AlertSettings;
  setAlertSettings:   (partial: Partial<AlertSettings>) => void;
  isPiP:              boolean;
  isPiPRef:           React.RefObject<boolean>;
  pipAutoMode:        boolean;
  pipSupported:       boolean;
  togglePipAutoMode:  () => void;
  exitPiP:            () => void;
};

const PostureContext = createContext<PostureContextType | null>(null);

// ── PiP overlay ───────────────────────────────────────────────────────────────
let _pipFlashTick = 0;
setInterval(() => { _pipFlashTick++; }, 500);

function drawPiPOverlay(canvas: HTMLCanvasElement, psi: number, zone: "GREEN" | "YELLOW" | "RED", psiHistory: number[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const flashOn = _pipFlashTick % 2 === 0;
  const zoneColor = zone === "RED" ? (flashOn ? "#FF5F52" : "#CC2200") : zone === "YELLOW" ? "#F8D060" : "#3DDB82";

  if (zone === "RED") {
    ctx.save();
    ctx.globalAlpha = flashOn ? 0.38 : 0.16;
    const de = (gx0: number, gy0: number, gx1: number, gy1: number, rx: number, ry: number, rw: number, rh: number) => {
      const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, "#FF5F52"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    };
    de(0, 0, 0, H * 0.2, 0, 0, W, H * 0.2);
    de(0, H, 0, H * 0.8, 0, H * 0.8, W, H * 0.2);
    de(0, 0, W * 0.12, 0, 0, 0, W * 0.12, H);
    de(W, 0, W * 0.88, 0, W * 0.88, 0, W * 0.12, H);
    ctx.restore();
  }

  const radius = Math.min(W, H) * 0.10, cx = W - radius - 18, cy = radius + 18;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = "rgba(6,10,7,0.90)"; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 4; ctx.stroke();
  const safeP = Math.max(0, Math.min(100, psi));
  ctx.beginPath(); ctx.arc(cx, cy, radius - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * safeP / 100);
  ctx.strokeStyle = zoneColor; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.shadowColor = zoneColor; ctx.shadowBlur = zone === "RED" && flashOn ? 18 : 8; ctx.globalAlpha = 1; ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = zoneColor;
  ctx.font = `bold ${Math.round(radius * 0.60)}px 'DM Serif Display', serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(Math.round(safeP)), cx, cy - radius * 0.08);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = `${Math.round(radius * 0.22)}px 'Sora', sans-serif`;
  ctx.fillText("PSI", cx, cy + radius * 0.38);
  ctx.restore();

  const badgeW = 76, badgeH = 22, bx = 14, by = H - badgeH - 14;
  ctx.save();
  ctx.globalAlpha = zone === "RED" && flashOn ? 1.0 : 0.88;
  ctx.beginPath(); ctx.roundRect(bx, by, badgeW, badgeH, 11); ctx.fillStyle = `${zoneColor}28`; ctx.fill();
  ctx.strokeStyle = `${zoneColor}70`; ctx.lineWidth = 1; ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = zoneColor;
  ctx.font = `bold ${Math.round(badgeH * 0.46)}px 'Sora', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(zone, bx + badgeW / 2, by + badgeH / 2);
  ctx.restore();

  const history = psiHistory.slice(-50);
  if (history.length < 2) return;
  const sL = 14, sR = 14, sBtm = by - 10, sH = Math.min(H * 0.12, 50), sTop = sBtm - sH, sW = W - sL - sR;
  const hMin = Math.max(0, Math.min(...history) - 5), hMax = Math.min(100, Math.max(...history) + 5), hR = hMax - hMin || 1;
  const tx = (i: number) => sL + (i / (history.length - 1)) * sW;
  const ty = (v: number) => sBtm - ((v - hMin) / hR) * sH;
  ctx.save(); ctx.globalAlpha = 0.82;
  ctx.beginPath(); ctx.rect(sL, sTop - 4, sW, sH + 8); ctx.clip();
  const fg = ctx.createLinearGradient(0, sTop, 0, sBtm);
  fg.addColorStop(0, `${zoneColor}44`); fg.addColorStop(1, `${zoneColor}00`);
  ctx.beginPath(); ctx.moveTo(tx(0), ty(history[0]));
  for (let i = 1; i < history.length; i++) {
    const mx = (tx(i - 1) + tx(i)) / 2;
    ctx.quadraticCurveTo(tx(i - 1), ty(history[i - 1]), mx, (ty(history[i - 1]) + ty(history[i])) / 2);
  }
  ctx.lineTo(tx(history.length - 1), ty(history[history.length - 1]));
  ctx.lineTo(tx(history.length - 1), sBtm); ctx.lineTo(tx(0), sBtm); ctx.closePath();
  ctx.fillStyle = fg; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx(0), ty(history[0]));
  for (let i = 1; i < history.length; i++) {
    const mx = (tx(i - 1) + tx(i)) / 2;
    ctx.quadraticCurveTo(tx(i - 1), ty(history[i - 1]), mx, (ty(history[i - 1]) + ty(history[i])) / 2);
  }
  ctx.lineTo(tx(history.length - 1), ty(history[history.length - 1]));
  ctx.strokeStyle = zoneColor; ctx.lineWidth = 1.8; ctx.shadowColor = zoneColor; ctx.shadowBlur = 4; ctx.lineJoin = "round"; ctx.stroke();
  ctx.beginPath(); ctx.arc(tx(history.length - 1), ty(history[history.length - 1]), 3, 0, Math.PI * 2);
  ctx.fillStyle = zoneColor; ctx.shadowBlur = 8; ctx.fill();
  ctx.restore();
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function PostureProvider({ children }: { children: React.ReactNode }) {
  const stream = usePostureStream();

  const engineRef        = useRef<PostureEngine | null>(null);
  const alertsRef        = useRef<PostureAlerts>(new PostureAlerts());
  const insightsRef      = useRef<PostureInsights>(new PostureInsights());
  const wasCalibratedRef = useRef(false);
  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);

  // ── PiP ───────────────────────────────────────────────────────────────────
  const { isPiP, isPiPRef, primeVideo, exitPiP, supported: pipSupported,
          enableAutoMode, disableAutoMode } = usePiP(canvasRef);
  const [pipAutoMode, setPipAutoMode] = useState(false);
  const togglePipAutoMode = useCallback(() => {
    const next = !pipAutoMode;
    setPipAutoMode(next);
    if (next) enableAutoMode(); else { disableAutoMode(); if (isPiPRef.current) exitPiP(); }
  }, [pipAutoMode, enableAutoMode, disableAutoMode, exitPiP, isPiPRef]);

  // ── Camera — starts immediately on app load ───────────────────────────────
  const [camGranted, setCamGranted] = useState(false);

  // Notification permission — only needs browser prompt, no camera
  useEffect(() => {
    PostureAlerts.requestPermission();
    return () => {
      engineRef.current?.stop();
      const v = internalVideoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Engine state ──────────────────────────────────────────────────────────
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("idle");
  const [devs, setDevs] = useState({ forward: 0, lateral: 0, shoulder: 0 });
  const [displayPsi, setDisplayPsi] = useState(0);
  const [alertActive, setAlertActive] = useState(false);
  const [redStreakSec, setRedStreakSec] = useState(0);
  const [recentRecalib, setRecentRecalib] = useState(false);
  const [insights, setInsights] = useState<InsightMessage[]>([
    { text: "Start calibration to begin analysis", icon: "🎯", severity: "info" },
  ]);
  const [heatmap, setHeatmap] = useState({ forward: 0, lateral: 0, shoulder: 0 });
  const heatmapRef = useRef({ forward: 0, lateral: 0, shoulder: 0 });
  const [calibrating, setCalibrating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const displayPsiSeeded = useRef(false);
  const psiHistoryRef = useRef<number[]>([]);
  useEffect(() => { psiHistoryRef.current = stream.psiHistory; }, [stream.psiHistory]);

  useEffect(() => {
    if (stream.psi === 0) return;
    if (!displayPsiSeeded.current) { setDisplayPsi(stream.psi); displayPsiSeeded.current = true; }
    else setDisplayPsi((prev: number) => 0.15 * stream.psi + 0.85 * prev);
  }, [stream.psi]);

  useEffect(() => {
    if (!stream.isCalibrated) return;
    const t = setInterval(() => setInsights(insightsRef.current.compute()), 2000);
    return () => clearInterval(t);
  }, [stream.isCalibrated]);

  // ── Alert settings ────────────────────────────────────────────────────────
  const [alertSettings, setAlertSettingsState] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const alertSettingsRef = useRef(alertSettings);
  const setAlertSettings = useCallback((partial: Partial<AlertSettings>) => {
    setAlertSettingsState((prev: AlertSettings) => {
      const next = { ...prev, ...partial };
      alertsRef.current.updateSettings(next);
      alertSettingsRef.current = next;
      return next;
    });
  }, []);

  // ── Engine data callback ──────────────────────────────────────────────────
  const handleEngineData = useCallback((data: {
    psi: number | null; zone: "GREEN" | "YELLOW" | "RED";
    forward_dev: number; lateral_dev: number; shoulder_dev: number; recalibrated: boolean;
  }) => {
    if (data.psi === null) return;
    stream.pushLiveData({ psi: data.psi, zone: data.zone, forward_dev: data.forward_dev, lateral_dev: data.lateral_dev, shoulder_dev: data.shoulder_dev, recalibrated: data.recalibrated });
    setDevs({ forward: data.forward_dev, lateral: data.lateral_dev, shoulder: data.shoulder_dev });
    const fired = alertsRef.current.update(data.zone);
    const streak = alertsRef.current.getRedStreakMs();
    setAlertActive(fired && alertSettingsRef.current.enableVisualFlash);
    setRedStreakSec(Math.floor(streak / 1000));
    if (fired) setTimeout(() => setAlertActive(false), 2000);
    if (isPiPRef.current && canvasRef.current) {
      drawPiPOverlay(canvasRef.current, data.psi, data.zone, psiHistoryRef.current);
    }
    const a = 0.02;
    heatmapRef.current = {
      forward:  a * Math.min(Math.abs(data.forward_dev) / 0.12, 1) + (1 - a) * heatmapRef.current.forward,
      lateral:  a * Math.min(Math.abs(data.lateral_dev) / 0.12, 1) + (1 - a) * heatmapRef.current.lateral,
      shoulder: a * Math.min(Math.abs(data.shoulder_dev) / 0.08, 1) + (1 - a) * heatmapRef.current.shoulder,
    };
    setHeatmap({ ...heatmapRef.current });
    insightsRef.current.push(data.forward_dev, data.lateral_dev, data.shoulder_dev);
    if (data.recalibrated) { setRecentRecalib(true); setTimeout(() => setRecentRecalib(false), 3000); }
  }, [stream.pushLiveData, isPiPRef]);

  // ── Start engine (called by Monitor's Start button) ───────────────────────
  const startEngine = useCallback(async () => {
    if (engineRef.current) return;
    setEngineStatus("starting");

    try {
      // ── Start camera here — only on explicit user action ─────────────────
      // Never on app load. Camera starts when user clicks "Start Monitoring".
      if (!internalVideoRef.current) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });

        const video = document.createElement("video");
        video.autoplay = true; video.playsInline = true; video.muted = true;
        internalVideoRef.current = video;
        video.srcObject = mediaStream;
        await new Promise<void>(res => { video.onloadedmetadata = () => { video.play(); res(); }; });

        const canvas = document.createElement("canvas");
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvasRef.current = canvas;

        setCamGranted(true);
      }

      const video  = internalVideoRef.current!;
      const canvas = canvasRef.current!;

      const engine = new PostureEngine(handleEngineData);
      await engine.attachExisting(video, canvas);
      engine.start();
      engineRef.current = engine;
      setEngineStatus("running");
    } catch (e) {
      console.error("[Engine] start failed:", e);
      setCamGranted(false);
      setEngineStatus("idle");
    }
  }, [handleEngineData]);

  // ── Stop engine (called by Monitor's Stop button) ─────────────────────────
  const stopEngine = useCallback(() => {
    if (!engineRef.current) return;
    if (wasCalibratedRef.current && stream.sessionSeconds > 10) {
      const metrics = engineRef.current.getSessionMetrics?.();
      stream.saveSession({
        greenSec: stream.greenSeconds, yellowSec: stream.yellowSeconds,
        redSec: stream.redSeconds, totalSec: stream.totalSeconds,
        durationSec: stream.sessionSeconds, alertCount: stream.alerts,
        recalibCount: stream.autoRecalibs, minP: stream.minPsi, maxP: stream.maxPsi,
        fatigueFlag: metrics?.fatigue_flag ?? false,
        psiSlope: metrics?.psi_slope ?? 0,
        sdi: metrics?.stability_degradation_index ?? 0,
      });
    }
    engineRef.current.stop();
    engineRef.current = null;
    wasCalibratedRef.current = false;
    stream.onStopped();

    // Stop camera tracks — camera restarts on next "Start Monitoring" click
    const v = internalVideoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    internalVideoRef.current = null;
    canvasRef.current = null;
    setCamGranted(false);
    setEngineStatus("stopped");
    setPipAutoMode(false); disableAutoMode();
    if (isPiPRef.current) exitPiP();
    displayPsiSeeded.current = false;
    setDisplayPsi(0); setDevs({ forward: 0, lateral: 0, shoulder: 0 });
    heatmapRef.current = { forward: 0, lateral: 0, shoulder: 0 };
    setHeatmap({ forward: 0, lateral: 0, shoulder: 0 });
    insightsRef.current = new PostureInsights();
    setInsights([{ text: "Start a new session to resume analysis", icon: "🎯", severity: "info" }]);
  }, [stream, disableAutoMode, exitPiP, isPiPRef]);

  // ── Calibration ───────────────────────────────────────────────────────────
  const triggerCalibration = useCallback(() => {
    if (!engineRef.current || calibrating) return;
    primeVideo(); // must be inside user gesture
    setCalibrating(true); setCountdown(3);
    heatmapRef.current = { forward: 0, lateral: 0, shoulder: 0 }; setHeatmap({ forward: 0, lateral: 0, shoulder: 0 });
    insightsRef.current = new PostureInsights();
    alertsRef.current.destroy(); alertsRef.current = new PostureAlerts();
    alertsRef.current.updateSettings(alertSettingsRef.current);
    let count = 3;
    const tick = setInterval(() => {
      count--;
      if (count > 0) { setCountdown(count); }
      else {
        clearInterval(tick); setCountdown(0);
        engineRef.current!.startCalibration();
        setTimeout(() => {
          setCalibrating(false); setCountdown(null);
          stream.onCalibrated();
          wasCalibratedRef.current = true;
          displayPsiSeeded.current = false;
          setPipAutoMode(true); enableAutoMode();
        }, 5000);
      }
    }, 1000);
  }, [calibrating, primeVideo, stream, enableAutoMode]);

  const value: PostureContextType = {
    // stream fields — explicit to satisfy TypeScript
    psi: stream.psi,
    zone: stream.zone,
    isCalibrated: stream.isCalibrated,
    isActive: stream.isActive,
    psiHistory: stream.psiHistory,
    weeklyData: stream.weeklyData,
    sessionHistory: stream.sessionHistory,
    stats: stream.stats,
    accuracy: stream.accuracy,
    alerts: stream.alerts,
    autoRecalibs: stream.autoRecalibs,
    durationFormatted: stream.durationFormatted,
    minPsi: stream.minPsi,
    maxPsi: stream.maxPsi,
    greenSeconds: stream.greenSeconds,
    yellowSeconds: stream.yellowSeconds,
    redSeconds: stream.redSeconds,
    totalSeconds: stream.totalSeconds,
    sessionSeconds: stream.sessionSeconds,
    pushLiveData: stream.pushLiveData,
    onCalibrated: stream.onCalibrated,
    onStopped: stream.onStopped,
    saveSession: stream.saveSession,
    // engine + UI fields
    engineStatus, startEngine, stopEngine, triggerCalibration,
    canvasRef, camGranted,
    devs, heatmap, displayPsi, alertActive, redStreakSec, recentRecalib,
    insights, countdown, calibrating,
    alertSettings, setAlertSettings,
    isPiP, isPiPRef, pipAutoMode, pipSupported, togglePipAutoMode, exitPiP,
  };

  return <PostureContext.Provider value={value}>{children}</PostureContext.Provider>;
}

export function usePosture() {
  const ctx = useContext(PostureContext);
  if (!ctx) throw new Error("usePosture must be used inside PostureProvider");
  return ctx;
}