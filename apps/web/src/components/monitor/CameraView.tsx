import { useEffect, useRef } from "react";

type Props = {
  onReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  zone?: "GREEN" | "YELLOW" | "RED";
};

export default function CameraView({ onReady, zone }: Props) {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);  // hold ref for cleanup

  const zoneGlow = {
    GREEN:  "0 0 0 1px rgba(74,222,128,0.15), 0 0 40px rgba(74,222,128,0.10)",
    YELLOW: "0 0 0 1px rgba(251,191,36,0.25), 0 0 50px rgba(251,191,36,0.18)",
    RED:    "0 0 0 1px rgba(239,68,68,0.35), 0 0 60px rgba(239,68,68,0.25)"
  };

  useEffect(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      onReady(video, canvas);
    }

    // Cleanup: stop all camera tracks when component unmounts (tab switch etc.)
    return () => {
      const src = videoRef.current?.srcObject as MediaStream | null;
      if (src) {
        src.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      }
      // Also stop any stream captured via ref
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        width: "900px",
        aspectRatio: "4 / 3",
        background: "#050a06",
        boxShadow: zone ? zoneGlow[zone as keyof typeof zoneGlow] : "var(--shadow-elevated)"
      }}
    >
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Corner accents */}
      {[
        "top-0 left-0 border-t border-l rounded-tl-2xl",
        "top-0 right-0 border-t border-r rounded-tr-2xl",
        "bottom-0 left-0 border-b border-l rounded-bl-2xl",
        "bottom-0 right-0 border-b border-r rounded-br-2xl",
      ].map((pos, i) => (
        <div
          key={i}
          className={`absolute w-6 h-6 pointer-events-none z-20 ${pos}`}
          style={{ borderColor: "rgba(74, 222, 128, 0.45)" }}
        />
      ))}

      {/* Live badge */}
      <div
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: "rgba(5, 10, 6, 0.75)",
          border: "1px solid rgba(74, 222, 128, 0.2)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: "#4ade80",
            boxShadow: "0 0 6px #4ade80",
            animation: "livePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', 'Fira Code', monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "rgba(74, 222, 128, 0.9)",
            textTransform: "uppercase",
          }}
        >
          Live
        </span>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-fill"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10"
      />

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}