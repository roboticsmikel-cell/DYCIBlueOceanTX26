import React from "react";
import Counter from "./Counter";

const InfoCard = ({
  locationName = "Unknown Location",
  collectionTitle = "Untitled Artifact",
  period = "Unknown Period",
  dateRange = "",
  category = "Uncategorized",
  museum = "Unknown Museum",
  context = "No description available.",
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

      {/* top glow lines */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-40" />

      <div className="relative z-10">
        {/* header */}
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#c3f5ff]/10 pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#ffd799]">
              Metadata File
            </p>
            <h2 className="mt-1 text-base font-bold uppercase tracking-tight text-[#c3f5ff]">
              {collectionTitle}
            </h2>
            {dateRange && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c3f5ff]/60">
                {dateRange}
              </p>
            )}
          </div>

          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.8)]" />
        </div>

        {/* metadata blocks */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Category
              </p>
              <p className="mt-1 text-sm font-semibold uppercase text-[#e2e2e6]">
                {category}
              </p>
            </div>

            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Custodian
              </p>
              <p className="mt-1 text-sm font-semibold uppercase text-[#e2e2e6]">
                {museum}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
              Context
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#e2e2e6]/90">
              {context}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Location
              </p>
              <p className="mt-1 text-sm font-medium text-[#c3f5ff]">
                {locationName}
              </p>
            </div>

            <div className="rounded-xl border border-[#c3f5ff]/10 bg-[#1a1c1f]/80 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
                Period
              </p>
              <p className="mt-1 text-sm font-medium text-[#c3f5ff]">
                {period}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#ffd799]/15 bg-[#1a1c1f]/80 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#bac9cc]">
              Estimated Measurement (cm)
            </p>
            <div className="mt-2 text-[#ffd799]">
              <Counter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;