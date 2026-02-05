import React from "react";

const MainHUD = ({ label = "J.A.R.V.I.S", size = 320 }) => {
  const s = `${size}px`;

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none"
      style={{ width: s, height: s }}
    >
      {/* OUTER RING */}
      <div className="absolute inset-0 rounded-full border border-cyan-400/30" />

      {/* ROTATING SEGMENT RING */}
      <div className="absolute inset-3 rounded-full animate-spinSlow">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(0,234,255,0.85)"
            strokeWidth="1.5"
            strokeDasharray="6 10"
          />
        </svg>
      </div>

      {/* REVERSE ROTATING MICRO TICKS */}
      <div className="absolute inset-8 rounded-full animate-spinReverse">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(0,234,255,0.4)"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
        </svg>
      </div>

      {/* INNER GLOW RING */}
      <div className="absolute inset-16 rounded-full border border-cyan-300/40 shadow-[0_0_25px_rgba(0,234,255,0.35)]" />

      {/* CENTER CORE */}
      <div className="absolute inset-24 rounded-full bg-[#07141f] border border-cyan-400/40 shadow-[0_0_20px_rgba(0,234,255,0.4)] flex items-center justify-center">
        <span className="text-cyan-300 tracking-[0.35em] text-[10px] font-medium pl-[0.35em]">
          {label}
        </span>
      </div>

      {/* HUD DIAL MARKERS */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-3 w-[1px] bg-cyan-400/40"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-${size / 2 - 12}px)`,
              transformOrigin: "center center",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MainHUD;