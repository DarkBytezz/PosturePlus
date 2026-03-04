export default function ScanLine() {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        height: 2,
        background:
          "linear-gradient(90deg, transparent, rgba(76,175,130,0.8), transparent)",
        boxShadow: "0 0 20px rgba(76,175,130,0.6)",
        animation: "scan 3.5s linear infinite",
        zIndex: 10,
      }}
    />
  );
}