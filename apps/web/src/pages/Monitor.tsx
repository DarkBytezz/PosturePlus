import CameraView from "../components/monitor/CameraView";
import BiometricsPanel from "../components/monitor/BiometricsPanel";
import PSITimelineGraph from "../components/monitor/PSITimelineGraph";
import AlertSettingsPanel from "../components/monitor/AlertSettingsPanel";
import { useState } from "react";
import { usePosture } from "../context/PostureContext";

export default function Monitor() {
  const {
    psi, zone, isCalibrated, psiHistory, durationFormatted,
    accuracy, alerts, autoRecalibs,
    greenSeconds, yellowSeconds, redSeconds, totalSeconds, sessionSeconds,
    minPsi, maxPsi,
    engineStatus, startEngine, stopEngine, triggerCalibration,
    canvasRef, camGranted,
    devs, heatmap, displayPsi, alertActive, redStreakSec, recentRecalib,
    insights, countdown, calibrating,
    alertSettings, setAlertSettings,
    isPiP, pipAutoMode, pipSupported, togglePipAutoMode, exitPiP,
  } = usePosture();

  const [showAlertSettings, setShowAlertSettings] = useState(false);

  const isRunning = engineStatus === "running" || engineStatus === "starting";

  return (
    <div className="min-h-[calc(100vh-4.5rem)] p-6 flex gap-6 relative overflow-y-auto">

      {/* ── Recalib toast ─────────────────────────────────────────────────── */}
      {recentRecalib && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{
            background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)",
            color: "#4ade80", backdropFilter: "blur(8px)", boxShadow: "0 0 20px rgba(74,222,128,0.2)",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-blink" />
          Baseline auto-recalibrated
        </div>
      )}

      {/* ── Alert flash overlay ───────────────────────────────────────────── */}
      {alertActive && (
        <div className="absolute inset-0 z-40 pointer-events-none rounded-2xl"
          style={{ border: "2px solid #ff5f52", boxShadow: "inset 0 0 60px rgba(255,95,82,0.12)", animation: "pulse 0.4s ease 3" }}
        />
      )}

      {/* ── LEFT — camera + controls ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* PiP status banner */}
        {isPiP && (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(61,219,130,0.1)", border: "1px solid rgba(61,219,130,0.3)", color: "#3DDB82" }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: "#3DDB82" }} />
              Picture-in-Picture active — monitoring while you work
            </div>
            <button onClick={exitPiP} style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 6, background: "rgba(61,219,130,0.12)", border: "1px solid rgba(61,219,130,0.3)", color: "#3DDB82", cursor: "pointer" }}>
              Exit PiP
            </button>
          </div>
        )}

        {/* Camera */}
        <div className="relative">
          <CameraView canvasRef={canvasRef} zone={zone} camGranted={camGranted} />

          {/* Calibration overlay */}
          {calibrating && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl"
              style={{ background: "rgba(5,10,6,0.75)", backdropFilter: "blur(4px)" }}>
              {countdown !== null && countdown > 0 ? (
                <>
                  <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                    <svg className="absolute inset-0" width="112" height="112" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(74,222,128,0.15)" strokeWidth="4" />
                      <circle cx="56" cy="56" r="50" fill="none" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - countdown / 3)}`}
                        style={{ transformOrigin: "56px 56px", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.9s linear", filter: "drop-shadow(0 0 6px #4ade80)" }} />
                    </svg>
                    <span className="text-5xl font-bold" style={{ fontFamily: "'DM Serif Display', serif", color: "#4ade80", filter: "drop-shadow(0 0 12px #4ade80)" }}>{countdown}</span>
                  </div>
                  <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#4ade80" }}>Sit straight</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Calibration starts in {countdown}s</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1 0 10 10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p className="text-sm font-bold tracking-widest uppercase" style={{ color: "#4ade80" }}>Calibrating…</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Hold still — 5 seconds</p>
                  <div className="mt-4 w-40 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full" style={{ background: "#4ade80", animation: "calibProgress 5s linear forwards" }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Controls row ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "stretch", position: "relative" }}>

          {/* Start / Stop monitoring */}
          {!isRunning ? (
            <button
              onClick={() => startEngine()}
              className="flex-1 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
              style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)", boxShadow: "0 0 20px rgba(74,222,128,0.3)" }}
            >
              ▶ Start Monitoring
            </button>
          ) : (
            <>
              {/* Calibrate */}
              <button
                onClick={triggerCalibration}
                disabled={calibrating}
                className="flex-1 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
                style={{
                  background:  calibrating ? "rgba(74,222,128,0.1)" : "var(--accent-primary)",
                  color:       calibrating ? "#4ade80" : "var(--text-on-accent)",
                  border:      calibrating ? "1px solid rgba(74,222,128,0.3)" : "none",
                  opacity:     calibrating ? 0.8 : 1,
                  boxShadow:   calibrating ? "none" : "0 0 20px rgba(74,222,128,0.3)",
                }}
              >
                {calibrating
                  ? countdown && countdown > 0 ? `Starting in ${countdown}…` : "Calibrating…"
                  : isCalibrated ? "↺ Recalibrate" : "Start Calibration"}
              </button>

              {/* Stop */}
              <button
                onClick={stopEngine}
                className="px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
                style={{
                  background: "rgba(255,95,82,0.1)", color: "#ff5f52",
                  border: "1px solid rgba(255,95,82,0.25)", whiteSpace: "nowrap",
                }}
              >
                ■ Stop
              </button>
            </>
          )}

          {/* Alert settings — only when running */}
          {isRunning && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowAlertSettings((p: boolean) => !p)}
                className="h-full px-3 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                style={{
                  background: showAlertSettings ? "var(--accent-glow)" : "var(--bg-elevated)",
                  color:      showAlertSettings ? "var(--accent-primary)" : "var(--text-muted)",
                  border: `1px solid ${showAlertSettings ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Alerts
                {!alertSettings.enableSound && !alertSettings.enableNotification && !alertSettings.enableVisualFlash && (
                  <span style={{ background: "var(--text-muted)", color: "var(--bg-primary)", borderRadius: "100px", padding: "1px 5px", fontSize: "0.58rem", fontWeight: 700 }}>OFF</span>
                )}
              </button>
              {showAlertSettings && (
                <AlertSettingsPanel settings={alertSettings} onChange={setAlertSettings} onClose={() => setShowAlertSettings(false)} />
              )}
            </div>
          )}

          {/* PiP button — only when running */}
          {isRunning && pipSupported && (
            <button
              onClick={togglePipAutoMode}
              title={pipAutoMode ? "Auto-PiP on — click to disable" : "Enable Auto-PiP"}
              className="h-full px-3 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
              style={{
                background: (isPiP || pipAutoMode) ? "var(--accent-glow)" : "var(--bg-elevated)",
                color:      (isPiP || pipAutoMode) ? "var(--accent-primary)" : "var(--text-muted)",
                border: `1px solid ${(isPiP || pipAutoMode) ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                whiteSpace: "nowrap",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <rect x="12" y="11" width="9" height="6" rx="1" fill="currentColor" stroke="none"/>
              </svg>
              {isPiP ? "● PiP" : pipAutoMode ? "Auto-PiP" : "PiP"}
            </button>
          )}
        </div>

        <style>{`@keyframes calibProgress { from { width: 0% } to { width: 100% } }`}</style>

        <PSITimelineGraph psiHistory={psiHistory} zone={zone} isCalibrated={isCalibrated} />
      </div>

      {/* ── RIGHT — biometrics ────────────────────────────────────────────── */}
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