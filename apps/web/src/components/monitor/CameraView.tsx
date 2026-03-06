import { useEffect, useRef, useState } from "react";

type Props = {
  onReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  zone?: "GREEN" | "YELLOW" | "RED";
};

export default function CameraView({ onReady, zone }: Props) {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  const zoneGlow = {
    GREEN:  "0 0 0 1px rgba(74,222,128,0.15), 0 0 40px rgba(74,222,128,0.10)",
    YELLOW: "0 0 0 1px rgba(251,191,36,0.25), 0 0 50px rgba(251,191,36,0.18)",
    RED:    "0 0 0 1px rgba(239,68,68,0.35), 0 0 60px rgba(239,68,68,0.25)"
  };

  const requestCamera = async () => {
    setCamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamState("granted");
    } catch {
      setCamState("denied");
    }
  };

  useEffect(() => {
    if (camState !== "granted") return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) onReady(video, canvas);
  }, [camState]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const src = videoRef.current?.srcObject as MediaStream | null;
      src?.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ width: "900px", aspectRatio: "4 / 3", background: "#050a06",
        boxShadow: zone ? zoneGlow[zone] : "var(--shadow-elevated)" }}>

      {/* Permission gate */}
      {camState !== "granted" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 30,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1rem",
          background: "#050a06",
        }}>
          {camState === "denied" ? (
            <>
              <div style={{ fontSize: "2rem", opacity: 0.8 }}>✕</div>
              <p style={{ color: "#ff5f52", fontSize: "0.9rem", fontWeight: 600 }}>Camera access denied</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", textAlign: "center", maxWidth: "260px", lineHeight: 1.6 }}>
                Allow camera access in your browser settings, then reload the page.
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: "64px", height: "64px", borderRadius: "16px",
                background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", fontWeight: 600, fontFamily: "'DM Serif Display', serif" }}>
                Camera access needed
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", textAlign: "center", maxWidth: "260px", lineHeight: 1.6 }}>
                Posture+ analyses your posture in real time.<br />
                Video never leaves your device.
              </p>
              <button onClick={requestCamera} disabled={camState === "requesting"}
                style={{
                  marginTop: "0.5rem", padding: "0.6rem 1.6rem", borderRadius: "12px",
                  background: camState === "requesting" ? "rgba(74,222,128,0.1)" : "#4ade80",
                  color: camState === "requesting" ? "#4ade80" : "#050a06",
                  border: camState === "requesting" ? "1px solid rgba(74,222,128,0.3)" : "none",
                  fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                  opacity: camState === "requesting" ? 0.7 : 1,
                }}>
                {camState === "requesting" ? "Requesting…" : "Enable Camera"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />

      {["top-0 left-0 border-t border-l rounded-tl-2xl","top-0 right-0 border-t border-r rounded-tr-2xl",
        "bottom-0 left-0 border-b border-l rounded-bl-2xl","bottom-0 right-0 border-b border-r rounded-br-2xl",
      ].map((pos, i) => (
        <div key={i} className={`absolute w-6 h-6 pointer-events-none z-20 ${pos}`}
          style={{ borderColor: "rgba(74,222,128,0.45)" }} />
      ))}

      {camState === "granted" && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(5,10,6,0.75)", border: "1px solid rgba(74,222,128,0.2)", backdropFilter: "blur(8px)" }}>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "livePulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(74,222,128,0.9)", textTransform: "uppercase" }}>
            Live
          </span>
        </div>
      )}

      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-fill" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />
      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  );
}