export default function SkeletonOverlay() {
  return (
    <svg
      viewBox="0 0 400 600"
      className="absolute"
      style={{
        top: "5%",
        left: "50%",
        transform: "translateX(-50%)",
        height: "80%",
        width: "auto",
        opacity: 0.18,
        zIndex: 5,
      }}
    >
      <circle cx="200" cy="55" r="38" fill="none" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="200" y1="93" x2="200" y2="120" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="130" y1="130" x2="270" y2="130" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="200" y1="120" x2="200" y2="340" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="130" y1="130" x2="95" y2="240" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="95" y1="240" x2="80" y2="330" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="270" y1="130" x2="305" y2="240" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="305" y1="240" x2="320" y2="330" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="155" y1="340" x2="245" y2="340" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="165" y1="340" x2="155" y2="480" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="155" y1="480" x2="148" y2="580" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="235" y1="340" x2="245" y2="480" stroke="#4CAF82" strokeWidth="1.5" />
      <line x1="245" y1="480" x2="252" y2="580" stroke="#4CAF82" strokeWidth="1.5" />
    </svg>
  );
}