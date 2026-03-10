import { useEffect, useRef } from "react";
import type { RefObject } from "react";

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  zone?: "GREEN" | "YELLOW" | "RED";
  camGranted: boolean;
};

// Pure display mirror — owns NO camera, NO stream, NO getUserMedia.
// Camera and canvas are owned by PostureContext.
// This component just copies the offscreen canvas onto a visible <canvas> at 12fps.

export default function CameraView({ canvasRef, zone, camGranted }: Props) {
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef     = useRef<number | null>(null);

  const zoneGlow = {
    GREEN:  "0 0 0 1px rgba(74,222,128,0.15), 0 0 40px rgba(74,222,128,0.10)",
    YELLOW: "0 0 0 1px rgba(251,191,36,0.25),  0 0 50px rgba(251,191,36,0.18)",
    RED:    "0 0 0 1px rgba(239,68,68,0.35),   0 0 60px rgba(239,68,68,0.25)",
  };

  // Mirror loop: copy offscreen canvas → visible canvas at 12fps
  useEffect(() => {
    if (!camGranted) return;

    const mirror = () => {
      const src  = canvasRef.current;
      const dest = displayRef.current;
      if (src && dest) {
        if (dest.width !== src.width || dest.height !== src.height) {
          dest.width  = src.width;
          dest.height = src.height;
        }
        const ctx = dest.getContext("2d");
        ctx?.drawImage(src, 0, 0);
      }
      rafRef.current = requestAnimationFrame(mirror);
    };

    rafRef.current = requestAnimationFrame(mirror);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [camGranted, canvasRef]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        width: "100%", aspectRatio: "4 / 3", background: "#050a06",
        boxShadow: zone ? zoneGlow[zone] : "var(--shadow-elevated)",
      }}
    >
      {/* Not yet started */}
      {!camGranted && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 30,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1rem",
          background: "#050a06",
        }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "16px",
            background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", fontWeight: 600, fontFamily: "'DM Serif Display', serif" }}>
            Click Start Monitoring
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", textAlign: "center", maxWidth: "260px", lineHeight: 1.6 }}>
            Camera starts when you begin a session.<br />Video never leaves your device.
          </p>
        </div>
      )}

      {/* Corner brackets */}
      {["top-0 left-0 border-t border-l rounded-tl-2xl", "top-0 right-0 border-t border-r rounded-tr-2xl",
        "bottom-0 left-0 border-b border-l rounded-bl-2xl", "bottom-0 right-0 border-b border-r rounded-br-2xl",
      ].map((pos, i) => (
        <div key={i} className={`absolute w-6 h-6 pointer-events-none z-20 ${pos}`}
          style={{ borderColor: "rgba(74,222,128,0.45)" }} />
      ))}

      {/* LIVE badge */}
      {camGranted && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(5,10,6,0.75)", border: "1px solid rgba(74,222,128,0.2)", backdropFilter: "blur(8px)" }}>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "livePulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(74,222,128,0.9)", textTransform: "uppercase" }}>
            Live
          </span>
        </div>
      )}

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />

      {/* Visible canvas — mirror of offscreen canvas owned by PostureContext */}
      <canvas ref={displayRef} className="absolute inset-0 w-full h-full z-10" />

      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  );
}