import React from "react";

const AnalysisCard = ({
  material = "Unknown Material",
  category = "Uncategorized",
  estimatedAge = "Unknown Age",
  possibleLocation = "Unknown Location",
  preservationCondition = "Unknown Condition",
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#00e5ff]/20 bg-[#111316]/90 p-4 text-[#e2e2e6] shadow-[0_0_24px_rgba(0,229,255,0.08)] backdrop-blur-md">
      {/* scanline */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(195,245,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

      {/* corner accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-[#c3f5ff]/70" />
        <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-[#c3f5ff]/70" />
        <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-[#c3f5ff]/70" />
        <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-[#c3f5ff]/70" />
      </div>

      {/* glow lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-40" />

      <div className="relative z-10">
        {/* header */}
        <div className="mb-3 flex items-center justify-between border-b border-[#c3f5ff]/10 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#bac9cc]">
              AI Analysis
            </p>
            <h3 className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-[#ffd799]">
              Classification Result
            </h3>
          </div>

          <div className="h-2 w-2 rounded-full bg-[#ffd799] shadow-[0_0_12px_rgba(255,179,0,0.8)]" />
        </div>

        {/* content */}
        <div className="space-y-3">
          {/* material + category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Material
              </p>
              <p className="mt-1 text-sm font-semibold uppercase text-[#e2e2e6]">
                {material}
              </p>
            </div>

            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Category
              </p>
              <p className="mt-1 text-sm font-semibold uppercase text-[#e2e2e6]">
                {category}
              </p>
            </div>
          </div>

          {/* estimated age */}
          <div className="rounded-xl border border-[#ffd799]/15 bg-[#1a1c1f]/80 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
              Estimated Age
            </p>
            <p className="mt-1 text-sm font-medium text-[#ffd799]">
              {estimatedAge}
            </p>
          </div>

          {/* location + condition */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Possible Origin
              </p>
              <p className="mt-1 text-sm font-medium text-[#c3f5ff]">
                {possibleLocation}
              </p>
            </div>

            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Preservation
              </p>
              <p className="mt-1 text-sm font-medium text-[#c3f5ff]">
                {preservationCondition}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCard;